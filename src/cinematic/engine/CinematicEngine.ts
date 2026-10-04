import { Vector3 } from 'three'
import { FULL_MOTION, type CinematicPhase, type MotionProfile, type ViewLayout } from '../types'
import { createCinematicState, type CinematicState } from './CinematicState'
import { CinematicTimeline, type CueEvent, type SequenceDefinition } from './CinematicTimeline'

/** Large frame gaps (tab switch, GC pause, debugger) must never teleport the choreography. */
export const MAX_FRAME_DT = 1 / 15

export interface EngineEvents {
  phase: (phase: CinematicPhase, previous: CinematicPhase) => void
  cue: (cue: CueEvent, engine: CinematicEngine) => void
  complete: () => void
  /** Fired after any discontinuous jump of the playhead (skip, replay, seek, motion change). */
  seek: (time: number) => void
  frame: (engine: CinematicEngine) => void
}

type Listeners = { [K in keyof EngineEvents]: Set<EngineEvents[K]> }

/** Derived per-frame quantities that are not choreographed directly. */
export interface EngineDerived {
  /** World-space velocity of the VELOCITY entity (units / second). */
  readonly velocityMotion: Vector3
  velocitySpeed: number
}

export interface CinematicEngineOptions {
  sequence: SequenceDefinition
  motion?: MotionProfile
  layout?: ViewLayout
  autoplay?: boolean
}

/**
 * The cinematic clock and conductor. Pure TypeScript: no React, no WebGL.
 *
 *  - `time`    : sequence playhead (seconds), clamped to the sequence duration.
 *  - `elapsed` : world clock driving ambient procedural motion; keeps running after the
 *                sequence completes so the scene holds alive instead of freezing.
 *
 * Rendering code calls `update(dt)` exactly once per frame and then reads `state`.
 */
export class CinematicEngine {
  readonly state: CinematicState = createCinematicState()
  readonly derived: EngineDerived = { velocityMotion: new Vector3(), velocitySpeed: 0 }

  time = 0
  elapsed = 0
  /** Delta (seconds) applied during the most recent update. */
  dt = 0
  timeScale = 1
  playing: boolean
  /**
   * When set, every update advances by exactly this delta regardless of real frame time.
   * Used for deterministic capture (verification screenshots, future offline rendering).
   */
  fixedDelta: number | null = null

  private timeline: CinematicTimeline
  readonly sequence: SequenceDefinition
  private motionProfile: MotionProfile
  private viewLayout: ViewLayout
  private currentPhase: CinematicPhase
  private completed = false
  /** Cues with time > cueCursor are still pending. -1 lets cues placed at t = 0 fire. */
  private cueCursor = -1
  private prevVelocityVisible = false
  private readonly prevVelocityPos = new Vector3()
  private readonly scratchCues: CueEvent[] = []
  private readonly listeners: Listeners = {
    phase: new Set(),
    cue: new Set(),
    complete: new Set(),
    seek: new Set(),
    frame: new Set(),
  }

  constructor({ sequence, motion = FULL_MOTION, layout = 'landscape', autoplay = true }: CinematicEngineOptions) {
    this.sequence = sequence
    this.motionProfile = motion
    this.viewLayout = layout
    this.timeline = new CinematicTimeline(sequence, this.state, motion, layout)
    this.currentPhase = this.timeline.phaseAt(0)
    this.playing = autoplay
    this.prevVelocityPos.copy(this.state.fighters.velocity.position)
  }

  get duration(): number {
    return this.timeline.duration
  }

  get phase(): CinematicPhase {
    return this.currentPhase
  }

  get motion(): MotionProfile {
    return this.motionProfile
  }

  get layout(): ViewLayout {
    return this.viewLayout
  }

  get isComplete(): boolean {
    return this.completed
  }

  get phases() {
    return this.timeline.phases
  }

  get cues() {
    return this.timeline.cues
  }

  get scenes() {
    return this.timeline.scenes
  }

  get shots() {
    return this.timeline.shots
  }

  get scene() {
    return this.timeline.sceneAt(this.time)
  }

  get shot() {
    return this.timeline.shotAt(this.time)
  }

  /** Playback speed of the sequence clock (review slow motion). */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale)
  }

  /** Jump to a scene by id (review mode). Returns false when the id is unknown. */
  seekScene(id: string): boolean {
    const scene = this.timeline.scenes.find((s) => s.id === id)
    if (!scene) return false
    this.seek(scene.time)
    return true
  }

  /** Authoring check — see CinematicTimeline.overlaps. */
  overlaps() {
    return this.timeline.overlaps()
  }

  on<K extends keyof EngineEvents>(event: K, fn: EngineEvents[K]): () => void {
    const set = this.listeners[event] as Set<EngineEvents[K]>
    set.add(fn)
    return () => set.delete(fn)
  }

  /** Advance by a real frame delta. */
  update(rawDt: number): void {
    const input = this.fixedDelta ?? rawDt
    const dt = input > MAX_FRAME_DT ? MAX_FRAME_DT : input < 0 ? 0 : input
    this.dt = dt
    if (!this.playing) {
      this.derived.velocityMotion.set(0, 0, 0)
      this.derived.velocitySpeed = 0
      this.emitFrame()
      return
    }

    this.elapsed += dt
    const next = Math.min(this.time + dt * this.timeScale, this.timeline.duration)
    this.time = next
    this.timeline.sample(next)

    const fired = this.timeline.cuesBetween(this.cueCursor, next, this.scratchCues)
    this.cueCursor = next
    for (const cue of fired) for (const fn of this.listeners.cue) fn(cue, this)

    this.updatePhase()
    this.updateDerived(dt)

    if (!this.completed && next >= this.timeline.duration) {
      this.completed = true
      for (const fn of this.listeners.complete) fn()
    }
    this.emitFrame()
  }

  /** Jump the playhead without firing intermediate cues. */
  seek(time: number): void {
    const t = Math.max(0, Math.min(time, this.timeline.duration))
    this.time = t
    this.cueCursor = t > 0 ? t : -1
    this.timeline.sample(t)
    this.completed = t >= this.timeline.duration
    this.updatePhase()
    this.resetDerived()
    for (const fn of this.listeners.seek) fn(t)
  }

  /** Skip Intro: land on the final held frame of the current sequence. */
  skip(): void {
    this.seek(this.timeline.duration)
    this.playing = true
    for (const fn of this.listeners.complete) fn()
  }

  /** Replay Intro from the first frame. */
  replay(): void {
    this.seek(0)
    this.playing = true
  }

  pause(): void {
    this.playing = false
  }

  play(): void {
    this.playing = true
  }

  /**
   * Switch motion profile (e.g. prefers-reduced-motion toggled mid-sequence).
   * The timeline is rebuilt — segments may choreograph differently — and the playhead
   * is preserved proportionally.
   */
  setMotion(profile: MotionProfile): void {
    if (profile === this.motionProfile) return
    this.motionProfile = profile
    this.rebuild()
  }

  /** Switch composition layout (orientation change). Rebuilt like `setMotion`. */
  setLayout(layout: ViewLayout): void {
    if (layout === this.viewLayout) return
    this.viewLayout = layout
    this.rebuild()
  }

  /** Recompile the timeline for the current profile/layout, preserving relative progress. */
  private rebuild(): void {
    const progress = this.timeline.duration > 0 ? this.time / this.timeline.duration : 0
    this.timeline.dispose()
    this.timeline = new CinematicTimeline(this.sequence, this.state, this.motionProfile, this.viewLayout)
    this.seek(progress * this.timeline.duration)
  }

  dispose(): void {
    this.timeline.dispose()
    for (const set of Object.values(this.listeners)) set.clear()
  }

  private updatePhase(): void {
    const phase = this.timeline.phaseAt(this.time)
    if (phase !== this.currentPhase) {
      const previous = this.currentPhase
      this.currentPhase = phase
      for (const fn of this.listeners.phase) fn(phase, previous)
    }
  }

  private updateDerived(dt: number): void {
    const pos = this.state.fighters.velocity.position
    const motion = this.derived.velocityMotion
    // Repositioning while invisible is a placement, not motion: never derive speed from it.
    const visible = this.state.fighters.velocity.reveal > 0
    if (dt > 0 && visible && this.prevVelocityVisible) {
      motion.subVectors(pos, this.prevVelocityPos).divideScalar(dt)
    } else {
      motion.set(0, 0, 0)
    }
    this.derived.velocitySpeed = motion.length()
    this.prevVelocityPos.copy(pos)
    this.prevVelocityVisible = visible
  }

  private resetDerived(): void {
    this.prevVelocityPos.copy(this.state.fighters.velocity.position)
    this.prevVelocityVisible = this.state.fighters.velocity.reveal > 0
    this.derived.velocityMotion.set(0, 0, 0)
    this.derived.velocitySpeed = 0
  }

  private emitFrame(): void {
    for (const fn of this.listeners.frame) fn(this)
  }
}
