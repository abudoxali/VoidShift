import { gsap } from 'gsap'
import type { CinematicPhase, MotionProfile, ViewLayout } from '../types'
import type { CinematicState } from './CinematicState'

/** A named, timestamped event emitted when the playhead crosses it (shake, ripple, audio…). */
export interface CueEvent {
  readonly name: string
  /** Absolute sequence time in seconds. */
  readonly time: number
  readonly data: Readonly<Record<string, number>>
}

/** A named scene (story beat) inside the sequence: the unit of review jumps (?scene=…). */
export interface SceneMarker {
  readonly id: string
  readonly label: string
  readonly time: number
}

/** A camera cut: the unit of previous / next shot in review mode. */
export interface ShotMarker {
  readonly name: string
  readonly time: number
}

export interface PhaseSpan {
  readonly phase: CinematicPhase
  readonly start: number
  readonly end: number
}

/** Everything a phase segment needs to choreograph itself. */
export interface SegmentContext {
  readonly tl: gsap.core.Timeline
  readonly state: CinematicState
  readonly motion: MotionProfile
  /** Composition layout the timeline is compiled for (selects portrait shot variants). */
  readonly layout: ViewLayout
  /** Absolute start of this segment. */
  readonly start: number
  readonly duration: number
  /** Converts segment-local seconds to absolute timeline seconds. */
  at(local: number): number
  /** Registers a cue at segment-local time. */
  cue(name: string, local: number, data?: Record<string, number>): void
  /** Marks the start of a named scene at segment-local time. */
  scene(id: string, label: string, local: number): void
  /** Records a camera cut (called by `shot`). */
  shotMark(name: string, local: number): void
  /**
   * Build-time memory shared by every segment of one compilation (e.g. the last pose scheduled
   * per fighter, so a pose transition knows what it blends from). Never read at playback.
   */
  readonly memory: Map<string, unknown>
}

export interface PhaseSegment {
  readonly phase: CinematicPhase
  /** Duration in seconds; may depend on the motion profile (reduced motion can shorten beats). */
  readonly duration: number | ((motion: MotionProfile) => number)
  build(ctx: SegmentContext): void
}

export interface SequenceDefinition {
  readonly id: string
  /** Applied at t = 0 so that seeking anywhere is reproducible. */
  readonly initialize?: (state: CinematicState) => void
  readonly segments: readonly PhaseSegment[]
}

/**
 * Compiles a declarative SequenceDefinition into a paused GSAP timeline.
 *
 * GSAP is used purely as an interpolation/easing engine: the timeline never runs on its
 * own ticker. The CinematicEngine samples it with `sample(time)` from the render loop,
 * which makes the cinematic fully deterministic, seekable and testable without a browser.
 */
const RESERVED = new Set(['parent', 'id', 'callbackScope', 'paused', 'runBackwards', 'startAt', 'lazy', 'duration', 'ease', 'delay', 'onComplete', 'onUpdate', 'onStart', 'immediateRender', 'overwrite', 'repeat', 'yoyo', 'stagger', 'data'])

export class CinematicTimeline {
  readonly id: string
  readonly duration: number
  readonly phases: readonly PhaseSpan[]
  readonly cues: readonly CueEvent[]
  readonly scenes: readonly SceneMarker[]
  readonly shots: readonly ShotMarker[]
  private readonly tl: gsap.core.Timeline

  constructor(definition: SequenceDefinition, state: CinematicState, motion: MotionProfile, layout: ViewLayout = 'landscape') {
    this.id = definition.id
    definition.initialize?.(state)
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
    const phases: PhaseSpan[] = []
    const cues: CueEvent[] = []
    const scenes: SceneMarker[] = []
    const shots: ShotMarker[] = []

    let cursor = 0
    const memory = new Map<string, unknown>()
    for (const segment of definition.segments) {
      const duration = typeof segment.duration === 'function' ? segment.duration(motion) : segment.duration
      const start = cursor
      const ctx: SegmentContext = {
        tl,
        state,
        motion,
        layout,
        start,
        duration,
        memory,
        at: (local) => start + local,
        cue: (name, local, data = {}) => {
          if (local < 0 || local > duration) {
            throw new Error(`Cue "${name}" at ${local}s is outside ${segment.phase} (0..${duration}s)`)
          }
          cues.push({ name, time: start + local, data })
        },
        scene: (id, label, local) => scenes.push({ id, label, time: start + local }),
        shotMark: (name, local) => shots.push({ name, time: start + local }),
      }
      segment.build(ctx)
      phases.push({ phase: segment.phase, start, end: start + duration })
      cursor += duration
    }

    // Pad the timeline so its duration equals the declared segment lengths, even if the
    // last tween ends early (a deliberate hold at the end of a phase).
    tl.set({}, {}, cursor)

    cues.sort((a, b) => a.time - b.time)
    scenes.sort((a, b) => a.time - b.time)
    shots.sort((a, b) => a.time - b.time)
    this.scenes = scenes
    this.shots = shots
    this.duration = cursor
    this.phases = phases
    this.cues = cues
    this.tl = tl
    // Prime: render the whole timeline once so every tween records its start values in timeline
    // order. Playback, seeks and jumps then all read the same recorded values (determinism).
    this.tl.time(cursor, true)
    this.tl.time(0, true)
  }

  /**
   * Authoring check: tweens that drive the same property of the same object over overlapping
   * time ranges. Their result depends on render order, and priming makes the later one start
   * from the earlier one's END value — a visible pop. Returned for tests / debugging.
   */
  overlaps(): Array<{ property: string; a: [number, number]; b: [number, number] }> {
    const spans: Array<{ target: object; property: string; start: number; end: number }> = []
    for (const child of this.tl.getChildren(true, true, false)) {
      const tween = child as gsap.core.Tween
      const duration = tween.duration()
      if (duration <= 0) continue
      const start = tween.startTime()
      const vars = tween.vars as Record<string, unknown>
      for (const target of tween.targets() as object[]) {
        for (const property of Object.keys(vars)) {
          if (RESERVED.has(property)) continue
          spans.push({ target, property, start, end: start + duration })
        }
      }
    }
    const found: Array<{ property: string; a: [number, number]; b: [number, number] }> = []
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        const a = spans[i]
        const b = spans[j]
        if (a.target !== b.target || a.property !== b.property) continue
        if (a.start < b.end - 1e-6 && b.start < a.end - 1e-6) found.push({ property: a.property, a: [a.start, a.end], b: [b.start, b.end] })
      }
    }
    return found
  }

  /** Writes the state for an absolute time. Safe to call in any order (forward, backward, jumps). */
  sample(time: number): void {
    const t = time < 0 ? 0 : time > this.duration ? this.duration : time
    this.tl.time(t, true)
  }

  /** The scene (or shot) active at `time`: the last marker at or before it. */
  sceneAt(time: number): SceneMarker | null {
    return lastAtOrBefore(this.scenes, time)
  }

  shotAt(time: number): ShotMarker | null {
    return lastAtOrBefore(this.shots, time)
  }

  phaseAt(time: number): CinematicPhase {
    const phases = this.phases
    for (let i = phases.length - 1; i >= 0; i--) {
      if (time >= phases[i].start) return phases[i].phase
    }
    return phases[0]?.phase ?? 'BOOT'
  }

  /** Collects cues with time in (from, to]. Allocation-free when `out` is reused. */
  cuesBetween(from: number, to: number, out: CueEvent[]): CueEvent[] {
    out.length = 0
    if (to <= from) return out
    for (const cue of this.cues) {
      if (cue.time > to) break
      if (cue.time > from) out.push(cue)
    }
    return out
  }

  dispose(): void {
    this.tl.kill()
  }
}

function lastAtOrBefore<T extends { time: number }>(list: readonly T[], time: number): T | null {
  let found: T | null = null
  for (const m of list) {
    if (m.time <= time + 1e-6) found = m
    else break
  }
  return found
}
