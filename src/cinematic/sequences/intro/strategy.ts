import { shot } from '../../camera/shot'
import { BURST, CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { MARKS, YAW } from './marks'
import { burst, moveTo, pose, tween } from './moves'

/**
 * SCENES 05 + 06 — FAILED STRATEGY → ANCHOR (2.7 s).
 * AERON backs off. A beat: close on his eyes — ordinary attacks do not work. The Coordinate
 * Anchor forms in his hand (a real object), he throws it with a full arm action, it passes NOX's
 * head — NOX's eyes follow it — and plants itself in the floor behind him.
 */
export const strategySegment: PhaseSegment = {
  phase: 'PHASE',
  duration: 2.7,
  build(ctx) {
    const { tl, state, at } = ctx
    const a = state.anchor
    ctx.scene('strategy', 'Failed strategy', 0)
    shot(ctx, 'RESET_TWO', 0)
    tl.to(state.world, { atmosphere: 0.85, duration: 0.9, ease: 'power1.inOut' }, at(0.1))
    pose(ctx, 'velocity', 'backstep', 0.0, 0.18, 'power2.out')
    moveTo(ctx, 'velocity', MARKS.reset, 0.0, 0.35, 'power2.out')
    tween(ctx, 'velocity', { yaw: YAW.east }, 0.0, 0.3, 'power2.out')
    pose(ctx, 'void', 'confident', 0.25, 0.4, 'power2.inOut')
    pose(ctx, 'velocity', 'think', 0.36, 0.3, 'power2.inOut')
    shot(ctx, 'AERON_THINK', 0.45)
    // The decision: a flicker in the eyes.
    tween(ctx, 'velocity', { energy: 1 }, 0.85, 0.08, 'power2.out')
    tween(ctx, 'velocity', { energy: 0.7 }, 0.95, 0.2)

    // The anchor forms in his right hand.
    ctx.scene('anchor', 'Coordinate anchor', 1.0)
    pose(ctx, 'velocity', 'anchorForm', 1.0, 0.2, 'power2.out')
    tl.set(a, { held: 1, planted: 0, glow: 0.6, spin: 0 }, at(1.0))
    tl.to(a, { visible: 1, duration: 0.25, ease: 'power2.out' }, at(1.04))
    ctx.cue(CUES.ANCHOR_FORM, 1.04)
    shot(ctx, 'ANCHOR_HAND', 1.02)

    // The throw: wind (hips and shoulders coil, lead hand aims) → release → follow-through.
    shot(ctx, 'THROW_SIDE', 1.42)
    pose(ctx, 'velocity', 'throwWind', 1.44, 0.18, 'power2.out')
    pose(ctx, 'velocity', 'throwRelease', 1.68, 0.14, 'power2.out')
    tl.set(a.position, { x: MARKS.anchorRelease.x, y: MARKS.anchorRelease.y, z: MARKS.anchorRelease.z }, at(1.71))
    tl.to(a, { held: 0, duration: 0.02 }, at(1.71))
    ctx.cue(CUES.ANCHOR_THROW, 1.71)
    tl.to(a.position, { x: MARKS.anchorPass.x, y: MARKS.anchorPass.y, z: MARKS.anchorPass.z, duration: 0.11, ease: 'none' }, at(1.73))
    tl.to(a.position, { x: MARKS.anchorPlant.x, y: MARKS.anchorPlant.y, z: MARKS.anchorPlant.z, duration: 0.17, ease: 'power1.in' }, at(1.84))
    tl.to(a, { spin: 26, duration: 0.28, ease: 'none' }, at(1.73))
    tl.set(a, { spin: 0 }, at(2.01))

    // NOX's eyes follow it past his head.
    pose(ctx, 'void', 'watch', 1.8, 0.16, 'power2.out')
    shot(ctx, 'NOX_WATCH', 1.8)

    // Planted: a beacon behind him.
    ctx.cue(CUES.ANCHOR_PLANT, 2.01)
    ctx.cue(CUES.GRID_RIPPLE, 2.01, { x: MARKS.anchorPlant.x, z: MARKS.anchorPlant.z, strength: 0.5 })
    burst(ctx, BURST.SPARKS, { x: MARKS.anchorPlant.x, y: 0.1, z: MARKS.anchorPlant.z }, 2.01, 0.6)
    tl.to(a, { planted: 1, glow: 1, duration: 0.16, ease: 'expo.out' }, at(2.01))
    tl.to(a, { glow: 0.5, duration: 0.4 }, at(2.25))
    shot(ctx, 'ANCHOR_PLANT', 2.06)
    pose(ctx, 'void', 'guard', 2.4, 0.25, 'power2.inOut')
    pose(ctx, 'velocity', 'lowGuard', 2.3, 0.3, 'power2.inOut')
  },
}
