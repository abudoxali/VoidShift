import { shot } from '../../camera/shot'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { face, pose, tween } from './moves'

/**
 * SCENE 02 — STANDOFF (1.3 s). Close inserts: AERON's eyes; NOX's eyes; AERON's guard rising
 * and his centre of gravity sinking. NOX raises his guard. No text.
 */
export const standoffSegment: PhaseSegment = {
  phase: 'REVEAL',
  duration: 1.3,
  build(ctx) {
    const { tl, state, at } = ctx
    ctx.scene('standoff', 'Standoff', 0)
    shot(ctx, 'AERON_EYES', 0)
    face(ctx, 'velocity', 'focus', 0.05, 0.25)
    face(ctx, 'void', 'threat', 0.38, 0.2)
    pose(ctx, 'velocity', 'guard', 0.05, 0.32, 'power2.out')
    tween(ctx, 'velocity', { energy: 0.6 }, 0.0, 0.3)
    shot(ctx, 'NOX_EYES', 0.38)
    pose(ctx, 'void', 'guard', 0.38, 0.38, 'power2.inOut')
    tween(ctx, 'void', { energy: 0.5 }, 0.38, 0.3)
    shot(ctx, 'AERON_STANCE_LOW', 0.78)
    face(ctx, 'velocity', 'determined', 0.78, 0.2)
    pose(ctx, 'velocity', 'lowGuard', 0.8, 0.4, 'power2.inOut')
    tl.to(state.world, { reveal: 40, structures: 1, atmosphere: 0.9, duration: 1.2, ease: 'power1.inOut' }, at(0))
    tl.to(state.lights, { key: 0.75, ambient: 0.3, rimVelocity: 1.2, rimVoid: 1.1, duration: 1.0 }, at(0.2))
  },
}
