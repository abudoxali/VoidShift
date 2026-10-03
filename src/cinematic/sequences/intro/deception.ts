import { shot } from '../../camera/shot'
import { BURST, CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { CHEST, MARKS, YAW } from './marks'
import { blink, burst, moveTo, pose, set, tween } from './moves'

/**
 * BEAT 07 — DECEPTION / LOCK (1.5 s).
 * Overhead: VOID is phased against nothing — the attack never came. VELOCITY reconstructs at
 * the anchor BEHIND it. VOID's head snaps round; its phase fails. VELOCITY springs up and over,
 * inverting above VOID's back.
 */
export const deceptionSegment: PhaseSegment = {
  phase: 'LOCK',
  duration: 1.5,
  build(ctx) {
    const { tl, state, at, motion } = ctx
    const R = motion.reduced
    const a = state.anchor

    shot(ctx, 'OVERHEAD', 0)
    // Reconstruction at the anchor.
    set(ctx, 'velocity', { yaw: YAW.west }, 0)
    pose(ctx, 'velocity', 'crouch', 0, 0.01)
    ctx.cue(CUES.TELEPORT_IN, 0.05)
    burst(ctx, BURST.ASSEMBLE, { x: MARKS.anchorPlant.x + 0.15, y: CHEST - 0.3, z: MARKS.anchorPlant.z + 0.1 }, 0.05, 1.0)
    tween(ctx, 'velocity', { reveal: 1 }, 0.05, R ? 0.4 : 0.26, 'power2.out')
    tl.to(a, { glow: 1.4, duration: 0.05 }, at(0.05))
    tl.to(a, { planted: 0, glow: 0, duration: 0.45, ease: 'power2.in' }, at(0.35))
    tl.to(a, { visible: 0, duration: 0.2 }, at(0.75))

    // VOID realises; its phase fails.
    pose(ctx, 'void', 'realize', 0.32, 0.22, 'power4.out')
    ctx.cue(CUES.VOID_REALIZE, 0.34)
    tween(ctx, 'void', { phase: 0.5 }, 0.4, 0.05)
    tween(ctx, 'void', { phase: 0 }, 0.47, 0.25, 'power2.in')
    tl.to(state.fx, { lens: 0.25, duration: 0.3 }, at(0.45))

    // Spring up and invert above VOID's back.
    shot(ctx, 'BEHIND_VOID', 0.45)
    pose(ctx, 'velocity', 'leap', 0.55, 0.08, 'expo.out')
    burst(ctx, BURST.DUST, { x: MARKS.anchorPlant.x, y: 0.05, z: MARKS.anchorPlant.z }, 0.58, 0.7)
    ctx.cue(CUES.VELOCITY_DASH, 0.58)
    if (R) blink(ctx, 'velocity', MARKS.above, 0.58, 0.18)
    else moveTo(ctx, 'velocity', MARKS.above, 0.58, 0.5, 'power2.out')
    tween(ctx, 'velocity', { pitch: Math.PI }, 0.62, R ? 0.6 : 0.46, 'power2.inOut')
    pose(ctx, 'velocity', 'coreHold', 0.95, 0.22, 'power2.out')
    shot(ctx, 'HERO_LOW', 1.12)
  },
}
