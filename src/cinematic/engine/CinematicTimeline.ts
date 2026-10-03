import { gsap } from 'gsap'
import type { CinematicPhase, MotionProfile } from '../types'
import type { CinematicState } from './CinematicState'

/** A named, timestamped event emitted when the playhead crosses it (shake, ripple, audio…). */
export interface CueEvent {
  readonly name: string
  /** Absolute sequence time in seconds. */
  readonly time: number
  readonly data: Readonly<Record<string, number>>
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
  /** Absolute start of this segment. */
  readonly start: number
  readonly duration: number
  /** Converts segment-local seconds to absolute timeline seconds. */
  at(local: number): number
  /** Registers a cue at segment-local time. */
  cue(name: string, local: number, data?: Record<string, number>): void
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
export class CinematicTimeline {
  readonly id: string
  readonly duration: number
  readonly phases: readonly PhaseSpan[]
  readonly cues: readonly CueEvent[]
  private readonly tl: gsap.core.Timeline

  constructor(definition: SequenceDefinition, state: CinematicState, motion: MotionProfile) {
    this.id = definition.id
    definition.initialize?.(state)
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
    const phases: PhaseSpan[] = []
    const cues: CueEvent[] = []

    let cursor = 0
    for (const segment of definition.segments) {
      const duration = typeof segment.duration === 'function' ? segment.duration(motion) : segment.duration
      const start = cursor
      const ctx: SegmentContext = {
        tl,
        state,
        motion,
        start,
        duration,
        at: (local) => start + local,
        cue: (name, local, data = {}) => {
          if (local < 0 || local > duration) {
            throw new Error(`Cue "${name}" at ${local}s is outside ${segment.phase} (0..${duration}s)`)
          }
          cues.push({ name, time: start + local, data })
        },
      }
      segment.build(ctx)
      phases.push({ phase: segment.phase, start, end: start + duration })
      cursor += duration
    }

    // Pad the timeline so its duration equals the declared segment lengths, even if the
    // last tween ends early (a deliberate hold at the end of a phase).
    tl.set({}, {}, cursor)

    cues.sort((a, b) => a.time - b.time)
    this.duration = cursor
    this.phases = phases
    this.cues = cues
    this.tl = tl
    this.tl.time(0, true)
  }

  /** Writes the state for an absolute time. Safe to call in any order (forward, backward, jumps). */
  sample(time: number): void {
    const t = time < 0 ? 0 : time > this.duration ? this.duration : time
    this.tl.time(t, true)
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
