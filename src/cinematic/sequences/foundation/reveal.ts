import { shot } from '../../camera/shot'
import { CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'

/**
 * ENVIRONMENT REVEAL — the computational dimension is resolved outward from the origin
 * while the camera cranes back to show its scale. Ends on a deliberate held beat.
 */
export const revealSegment: PhaseSegment = {
  phase: 'REVEAL',
  duration: 3.4,
  build(ctx) {
    const { tl, state, at } = ctx
    const w = state.world
    shot(ctx, 'REVEAL_CRANE', 0, { duration: 3.1, ease: 'power3.inOut' })
    tl.to(w, { reveal: 72, duration: 3.0, ease: 'power2.in' }, at(0.1))
    tl.to(w, { atmosphere: 1, duration: 2.6, ease: 'power1.inOut' }, at(0.2))
    tl.to(w, { origin: 0.35, duration: 1.4, ease: 'power2.out' }, at(1.6))
    ctx.cue(CUES.GRID_RIPPLE, 0.15, { x: 0, z: 0, strength: 0.55 })
  },
}
