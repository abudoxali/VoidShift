import { shot } from '../../camera/shot'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { pose } from './moves'

/** BEAT 03 — STANDOFF (1.4 s). A slow push; both breathe; VOID raises its guard; light swells. */
export const standoffSegment: PhaseSegment = {
  phase: 'SPAWN',
  duration: 1.4,
  build(ctx) {
    const { tl, state, at } = ctx
    shot(ctx, 'WIDE_PUSH', 0, { duration: 1.4, ease: 'sine.inOut' })
    pose(ctx, 'void', 'guard', 0.35, 0.6, 'power2.inOut')
    // The survey axes recede: from here on the floor only reads where light lands on it.
    tl.to(state.world, { axis: 0.12, duration: 1.2, ease: 'sine.inOut' }, at(0))
    tl.to(state.lights, { rimVelocity: 1.35, rimVoid: 1.3, duration: 0.7, ease: 'sine.inOut' }, at(0.2))
    tl.to(state.lights, { rimVelocity: 1, rimVoid: 1, duration: 0.5, ease: 'sine.inOut' }, at(0.9))
  },
}
