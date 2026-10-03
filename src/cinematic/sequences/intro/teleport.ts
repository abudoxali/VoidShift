import { shot } from '../../camera/shot'
import { BURST, CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { CHEST, MARKS } from './marks'
import { blink, burst, flash, impactFrame, moveTo, place, pose, speedLines, tween } from './moves'

/**
 * BEAT 06 — TELEPORT (1.9 s).
 * VELOCITY throws its coordinate anchor at VOID's head. VOID phases; the anchor passes through
 * and plants itself in the floor behind VOID — a beacon of light (insert shot). VELOCITY then
 * attacks head-on. VOID phases again, expecting the pass-through… and VELOCITY collapses into
 * light mid-dash (implosion, impact frame): it was never going to arrive.
 */
export const TELEPORT_OUT_AT = 1.5

export const teleportSegment: PhaseSegment = {
  phase: 'TELEPORT',
  duration: 1.9,
  build(ctx) {
    const { tl, state, at, motion } = ctx
    const R = motion.reduced
    const a = state.anchor

    // Throw.
    shot(ctx, 'THROW_LOW', 0)
    pose(ctx, 'velocity', 'throwWind', 0, 0.22, 'power2.out')
    pose(ctx, 'velocity', 'throw', 0.26, 0.07, 'expo.out')
    ctx.cue(CUES.ANCHOR_THROW, 0.26)
    tl.set(a.position, { x: MARKS.anchorRelease.x, y: MARKS.anchorRelease.y, z: MARKS.anchorRelease.z }, at(0.26))
    tl.set(a, { visible: 1, spin: 0, planted: 0, glow: 0.6 }, at(0.26))
    tl.to(a.position, { x: MARKS.voidHead.x, y: MARKS.voidHead.y, z: MARKS.voidHead.z, duration: 0.1, ease: 'none' }, at(0.26))
    tl.to(a.position, { x: MARKS.anchorPlant.x, y: MARKS.anchorPlant.y + 0.38, z: MARKS.anchorPlant.z, duration: 0.18, ease: 'power1.in' }, at(0.36))
    tl.to(a, { spin: 22, duration: 0.28, ease: 'none' }, at(0.26))
    tl.set(a, { spin: 0 }, at(0.545))

    // VOID phases; the anchor passes through its head.
    pose(ctx, 'void', 'phaseLean', 0.3, 0.08, 'power3.out')
    tween(ctx, 'void', { phase: 1 }, 0.31, 0.04, 'expo.out')
    ctx.cue(CUES.VOID_PHASE, 0.36)
    burst(ctx, BURST.VOID, MARKS.voidHead, 0.36, 0.6)
    tween(ctx, 'void', { phase: 0.15 }, 0.5, 0.4)

    // Plant: the beacon. Insert shot — the camera notices it.
    ctx.cue(CUES.ANCHOR_PLANT, 0.545)
    ctx.cue(CUES.GRID_RIPPLE, 0.545, { x: MARKS.anchorPlant.x, z: MARKS.anchorPlant.z, strength: 0.6 })
    burst(ctx, BURST.SPARKS, { x: MARKS.anchorPlant.x, y: 0.1, z: MARKS.anchorPlant.z }, 0.545, 0.7)
    tl.to(a, { planted: 1, glow: 1, duration: 0.18, ease: 'expo.out' }, at(0.545))
    tl.to(a, { glow: 0.55, duration: 0.5 }, at(0.75))
    shot(ctx, 'MARKER_INSERT', 0.6)
    shot(ctx, 'MARKER_PUSH', 0.62, { duration: 0.5, ease: 'power2.out' })
    pose(ctx, 'void', 'guard', 0.7, 0.3, 'power2.inOut')
    pose(ctx, 'velocity', 'ready', 0.5, 0.3)

    // The feint: a direct attack VOID knows how to beat.
    pose(ctx, 'velocity', 'crouch', 1.12, 0.2, 'power2.out')
    if (R) {
      shot(ctx, 'THREE_Q_LEFT', 1.15)
      moveTo(ctx, 'velocity', MARKS.feint, 1.12, 0.27, 'sine.inOut')
    } else {
      shot(ctx, 'SIDE_TRACK_B', 1.15)
      pose(ctx, 'velocity', 'dash', 1.34, 0.05)
      moveTo(ctx, 'velocity', MARKS.feint, 1.34, 0.17, 'expo.in')
      speedLines(ctx, 1.34, 0.17, 0, 0.9)
    }
    pose(ctx, 'void', 'phaseLean', 1.38, 0.1, 'power3.out')
    tween(ctx, 'void', { phase: 1 }, 1.4, 0.05, 'expo.out')
    tl.to(state.fx, { lens: 0.9, duration: 0.06 }, at(1.4))

    // Collapse: VELOCITY implodes into light before it reaches VOID.
    ctx.cue(CUES.TELEPORT_OUT, TELEPORT_OUT_AT)
    burst(ctx, BURST.IMPLODE, { x: MARKS.feint.x, y: CHEST, z: MARKS.feint.z }, TELEPORT_OUT_AT, 1.2)
    impactFrame(ctx, TELEPORT_OUT_AT, 1)
    flash(ctx, TELEPORT_OUT_AT, 0.18, 0.12)
    const arrive = { x: MARKS.anchorPlant.x + 0.15, y: 0, z: MARKS.anchorPlant.z + 0.1 }
    if (R) blink(ctx, 'velocity', arrive, TELEPORT_OUT_AT - 0.1, 0.16)
    else {
      tween(ctx, 'velocity', { reveal: 0, phase: 1 }, TELEPORT_OUT_AT, 0.07, 'power2.in')
      tween(ctx, 'velocity', { phase: 0 }, TELEPORT_OUT_AT + 0.08, 0.01)
    }
    place(ctx, 'velocity', arrive, 1.62)
  },
}
