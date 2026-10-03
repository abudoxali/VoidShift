import { shot } from '../../camera/shot'
import { BURST, CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { CHEST, MARKS } from './marks'
import { burst, pose, tween } from './moves'

/**
 * BEAT 02 — CHARACTER REVEAL (3.0 s). VELOCITY reconstructs out of converging light, head
 * bowed, then snaps into its stance. Hard cut: space peels open and VOID unfolds out of it.
 * Hard cut: the wide — two opponents.
 */
export const revealSegment: PhaseSegment = {
  phase: 'REVEAL',
  duration: 3.0,
  build(ctx) {
    const { tl, state, at } = ctx
    const w = state.world
    const l = state.lights

    // VELOCITY assembles.
    shot(ctx, 'REVEAL_VELOCITY', 0)
    shot(ctx, 'REVEAL_VELOCITY_PUSH', 0.02, { duration: 1.35, ease: 'power2.inOut' })
    ctx.cue(CUES.VELOCITY_ASSEMBLE, 0)
    burst(ctx, BURST.ASSEMBLE, { x: MARKS.velocityHome.x, y: CHEST, z: 0 }, 0, 1.2)
    tween(ctx, 'velocity', { reveal: 1, energy: 0.9 }, 0, 0.9, 'power2.out')
    tl.to(l, { rimVelocity: 1, duration: 0.6 }, at(0.1))
    tl.to(w, { reveal: 60, duration: 2.6, ease: 'power1.in' }, at(0))
    pose(ctx, 'velocity', 'ready', 0.85, 0.42, 'back.out(1.7)')
    tween(ctx, 'velocity', { energy: 0.55 }, 1.0, 0.6)

    // VOID unfolds out of a tear.
    shot(ctx, 'REVEAL_VOID', 1.4)
    shot(ctx, 'REVEAL_VOID_PUSH', 1.42, { duration: 1.0, ease: 'power2.inOut' })
    ctx.cue(CUES.VOID_OPEN, 1.4)
    burst(ctx, BURST.VOID, { x: MARKS.voidHome.x, y: 0.9, z: 0 }, 1.4, 1.3)
    tl.to(state.fx, { lens: 1, duration: 0.18, ease: 'expo.out' }, at(1.4))
    tl.to(state.fx, { lens: 0.25, duration: 0.9, ease: 'power2.out' }, at(1.6))
    tween(ctx, 'void', { reveal: 1, energy: 0.8 }, 1.4, 0.65, 'power2.out')
    tween(ctx, 'void', { phase: 0.7 }, 1.4, 0.1)
    tween(ctx, 'void', { phase: 0 }, 1.6, 0.8)
    tween(ctx, 'void', { energy: 0.4 }, 2.05, 0.6)
    tl.to(w, { voidField: 0.55, duration: 0.8 }, at(1.4))
    tl.to(l, { rimVoid: 1, duration: 0.5 }, at(1.45))
    pose(ctx, 'void', 'stand', 1.7, 0.9, 'power3.inOut')

    // Wide: both opponents.
    shot(ctx, 'WIDE', 2.45)
    tl.to(w, { structures: 1, atmosphere: 1, duration: 1.4, ease: 'power2.out' }, at(1.5))
    tl.to(l, { key: 0.7, ambient: 0.4, duration: 0.8 }, at(2.3))
  },
}
