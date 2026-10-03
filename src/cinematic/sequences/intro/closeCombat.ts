import { shot } from '../../camera/shot'
import { BURST, CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { CHEST, MARKS, YAW } from './marks'
import { arc, blink, burst, flash, moveTo, place, pose, set, shakeIf, speedLines, tween } from './moves'

/**
 * BEAT 05 — CLOSE COMBAT (3.0 s).
 * Jab → VOID blocks (sparks, hit-stop). Spinning kick → VOID side-steps by phasing (no wind-up,
 * no travel: it is simply somewhere else, an echo left behind). Rising strike → VELOCITY vaults
 * over VOID with a forward flip while VOID grabs at empty air, and lands on the other side.
 */
export const closeCombatSegment: PhaseSegment = {
  phase: 'PHASE',
  duration: 3.0,
  build(ctx) {
    const { tl, state, at, motion } = ctx
    const R = motion.reduced
    shot(ctx, 'CLOSE_COMBAT', 0)

    // Close the distance.
    pose(ctx, 'velocity', 'crouch', 0, 0.12, 'power2.out')
    if (R) blink(ctx, 'velocity', MARKS.closeRange, 0.12, 0.18)
    else {
      pose(ctx, 'velocity', 'dash', 0.12, 0.05)
      moveTo(ctx, 'velocity', MARKS.closeRange, 0.12, 0.17, 'expo.in')
      speedLines(ctx, 0.12, 0.18, Math.PI, 0.7)
    }

    // 1. Jab — blocked.
    pose(ctx, 'void', 'block', 0.24, 0.1, 'power3.out')
    pose(ctx, 'velocity', 'jab', 0.3, 0.06, 'expo.out')
    ctx.cue(CUES.CLASH, 0.36)
    burst(ctx, BURST.SPARKS, { x: 2.72, y: 1.5, z: 0.05 }, 0.36, 1.0)
    flash(ctx, 0.36, 0.1, 0.1)
    shakeIf(ctx, 0.36, 0.3)
    tween(ctx, 'void', { hit: 0.6 }, 0.36, 0.02)
    tween(ctx, 'void', { hit: 0 }, 0.4, 0.3)

    // 2. Spinning kick — VOID is no longer there.
    pose(ctx, 'velocity', 'spinKick', 0.5, 0.14, 'back.out(1.5)')
    tween(ctx, 'velocity', { yaw: YAW.west - Math.PI * 2 }, 0.5, 0.32, 'power2.out')
    set(ctx, 'velocity', { yaw: YAW.west }, 0.83)
    tween(ctx, 'void', { phase: 1 }, 0.58, 0.04, 'expo.out')
    place(ctx, 'void', MARKS.voidSidestep, 0.62)
    ctx.cue(CUES.VOID_PHASE, 0.62)
    burst(ctx, BURST.VOID, { x: MARKS.voidHome.x, y: CHEST, z: 0 }, 0.62, 0.7)
    tween(ctx, 'void', { phase: 0.25 }, 0.7, 0.25)
    pose(ctx, 'void', 'guard', 0.62, 0.15)

    // 3. Rising strike — vault over VOID; VOID grabs at the air.
    pose(ctx, 'velocity', 'crouch', 0.92, 0.1, 'power2.out')
    pose(ctx, 'velocity', 'rising', 1.04, 0.08, 'expo.out')
    shot(ctx, 'OVER_LOW', 1.1)
    if (R) {
      arc(ctx, 'velocity', MARKS.vaultLanding, 1.4, 1.1, 0.9)
      tween(ctx, 'velocity', { yaw: YAW.east }, 1.4, 0.4, 'power2.inOut')
    } else {
      arc(ctx, 'velocity', MARKS.vaultLanding, 2.05, 1.1, 0.64)
      pose(ctx, 'velocity', 'flip', 1.22, 0.1)
      tween(ctx, 'velocity', { pitch: Math.PI * 2 }, 1.12, 0.62, 'power1.inOut')
      set(ctx, 'velocity', { pitch: 0 }, 1.75)
      tween(ctx, 'velocity', { yaw: YAW.east }, 1.2, 0.5, 'power2.inOut')
      speedLines(ctx, 1.1, 0.3, Math.PI / 2, 0.6)
    }
    moveTo(ctx, 'void', MARKS.voidHome, 1.0, 0.3, 'power2.inOut')
    tween(ctx, 'void', { phase: 0 }, 1.0, 0.3)
    pose(ctx, 'void', 'reach', 1.2, 0.16, 'back.out(1.6)')
    ctx.cue(CUES.VOID_GRAB, 1.28)

    const landAt = R ? 2.0 : 1.74
    shot(ctx, 'THREE_Q_LEFT', landAt)
    pose(ctx, 'velocity', 'land', landAt, 0.1, 'power2.out')
    ctx.cue(CUES.LAND, landAt + 0.02)
    burst(ctx, BURST.DUST, { x: MARKS.vaultLanding.x, y: 0.05, z: MARKS.vaultLanding.z }, landAt + 0.02, 0.8)
    tween(ctx, 'void', { yaw: YAW.west }, 1.55, 0.4, 'power3.inOut')
    pose(ctx, 'void', 'guard', 1.6, 0.4, 'power2.inOut')
    pose(ctx, 'velocity', 'ready', landAt + 0.22, 0.3, 'power2.out')
    tl.to(state.fx, { lens: 0.45, duration: 0.3, ease: 'sine.inOut' }, at(2.4))
  },
}
