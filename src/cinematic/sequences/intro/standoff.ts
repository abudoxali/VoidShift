import { shot } from '../../camera/shot'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { pose } from './moves'

/**
 * BEAT 03 — STANDOFF (1.4 s). A push on the two-shot, then a cut to VOID's slit eye as it raises
 * its guard; the rims swell. Stillness before the first move.
 */
export const standoffSegment: PhaseSegment = {
  phase: 'SPAWN',
  duration: 1.4,
  build(ctx) {
    const { tl, state, at } = ctx
    shot(ctx, 'WIDE_PUSH', 0, { duration: 0.75, ease: 'sine.in' })
    shot(ctx, 'STANDOFF_VOID', 0.75)
    shot(ctx, 'STANDOFF_VOID_PUSH', 0.77, { duration: 0.63, ease: 'sine.out' })
    pose(ctx, 'void', 'guard', 0.82, 0.4, 'power3.out')
    // The survey axes recede: from here on the floor only reads where light lands on it.
    tl.to(state.world, { axis: 0.12, duration: 1.2, ease: 'sine.inOut' }, at(0))
    tl.to(state.lights, { rimVelocity: 1.35, rimVoid: 1.3, duration: 0.7, ease: 'sine.inOut' }, at(0.2))
    tl.to(state.lights, { rimVelocity: 1, rimVoid: 1, duration: 0.5, ease: 'sine.inOut' }, at(0.9))
  },
}
