import { shot } from '../../camera/shot'
import { CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'

/**
 * BEAT 01 — DARK OPENING (1.4 s). A slit of light opens on darkness; lines of light race out
 * along the floor from the origin and the world's lattice starts to resolve. No boot screen.
 */
export const openingSegment: PhaseSegment = {
  phase: 'BOOT',
  duration: 1.4,
  build(ctx) {
    const { tl, state, at } = ctx
    shot(ctx, 'OPEN_DARK', 0)
    shot(ctx, 'OPEN_PUSH', 0.02, { duration: 1.38, ease: 'power1.in' })
    tl.to(state.fx, { gate: 1, duration: 0.9, ease: 'expo.inOut' }, at(0.15))
    tl.to(state.world, { axis: 1, duration: 0.75, ease: 'expo.out' }, at(0.22))
    ctx.cue(CUES.BOOT_PULSE, 0.22)
    tl.to(state.world, { atmosphere: 0.45, duration: 1.0, ease: 'power1.inOut' }, at(0.4))
    tl.to(state.world, { reveal: 18, duration: 0.85, ease: 'power2.in' }, at(0.55))
    tl.to(state.lights, { ambient: 0.25, duration: 1.0 }, at(0.4))
  },
}
