import { shot } from '../../camera/shot'
import { BURST, CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { CHEST, MARKS, YAW } from './marks'
import { blink, burst, dash, flash, impactFrame, moveTo, place, pose, set, tween } from './moves'

/**
 * SCENES 07 + 08 — SECOND ATTACK → TELEPORT (1.3 s).
 * AERON comes at NOX from the front again; NOX phases, confident, and starts his counter as
 * AERON seems to pass through. AERON fragments — light collapses — an EMPTY frame — the anchor
 * flares — hard cut: AERON reconstructs above the anchor, behind NOX (energy skeleton →
 * fragments → body → scarf snap).
 */
export const teleportSegment: PhaseSegment = {
  phase: 'TELEPORT',
  duration: 1.3,
  build(ctx) {
    const { tl, state, at, motion } = ctx
    const a = state.anchor
    ctx.scene('second-attack', 'Second attack', 0)
    shot(ctx, 'SECOND_ATTACK', 0)
    pose(ctx, 'velocity', 'dash', 0.0, 0.06, 'expo.out')
    if (motion.reduced) moveTo(ctx, 'velocity', MARKS.dashInto, 0.04, 0.3, 'sine.inOut')
    else dash(ctx, 'velocity', MARKS.dashInto, 0.06, 0.22)
    tween(ctx, 'velocity', { trails: 1, energy: 1 }, 0.06, 0.05)
    pose(ctx, 'void', 'confident', 0.04, 0.14, 'power2.out')
    tween(ctx, 'void', { phase: 1 }, 0.2, 0.04, 'expo.out')
    ctx.cue(CUES.VOID_PHASE, 0.22)
    pose(ctx, 'velocity', 'cross', 0.26, 0.05, 'expo.out')
    pose(ctx, 'void', 'elbowWind', 0.3, 0.12, 'power2.out')

    // The anchor answers; AERON comes apart inside NOX.
    ctx.scene('teleport', 'Teleport', 0.34)
    tl.to(a, { glow: 1.6, duration: 0.05 }, at(0.33))
    ctx.cue(CUES.TELEPORT_OUT, 0.34)
    pose(ctx, 'velocity', 'fragment', 0.34, 0.06, 'power2.out')
    burst(ctx, BURST.IMPLODE, { x: MARKS.dashInto.x, y: CHEST, z: MARKS.dashInto.z }, 0.34, 0.9)
    impactFrame(ctx, 0.36, 1)
    if (motion.reduced) blink(ctx, 'velocity', MARKS.reconstruct, 0.36, 0.12)
    else tween(ctx, 'velocity', { reveal: 0, trails: 0 }, 0.34, 0.12, 'power2.in')
    tween(ctx, 'void', { phase: 0.35 }, 0.42, 0.2)

    // Empty frame: NOX alone, the beacon behind him.
    shot(ctx, 'TELEPORT_EMPTY', 0.42)
    // Anchor flare.
    tl.to(a, { glow: 2.2, duration: 0.06 }, at(0.6))
    flash(ctx, 0.6, 0.22, 0.12)
    burst(ctx, BURST.SPARKS, { x: MARKS.anchorPlant.x, y: 0.6, z: MARKS.anchorPlant.z }, 0.6, 0.6)

    // Hard cut: reconstruction above / behind.
    shot(ctx, 'RECONSTRUCT', 0.64)
    if (!motion.reduced) place(ctx, 'velocity', MARKS.reconstruct, 0.62)
    set(ctx, 'velocity', { yaw: YAW.west }, 0.62)
    pose(ctx, 'velocity', 'airTuck', 0.62, 0.02)
    ctx.cue(CUES.TELEPORT_IN, 0.64)
    burst(ctx, BURST.ASSEMBLE, { x: MARKS.reconstruct.x, y: MARKS.reconstruct.y + 0.6, z: MARKS.reconstruct.z }, 0.64, 0.7)
    if (!motion.reduced) tween(ctx, 'velocity', { reveal: 1 }, 0.64, 0.4, 'power2.out')
    tl.to(a, { planted: 0, glow: 0, duration: 0.35, ease: 'power2.in' }, at(0.95))
    tl.to(a, { visible: 0, duration: 0.2 }, at(1.1))
  },
}
