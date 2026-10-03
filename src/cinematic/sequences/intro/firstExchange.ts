import { shot } from '../../camera/shot'
import { BURST, CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { CHEST, MARKS, YAW } from './marks'
import { arc, blink, burst, flash, moveTo, pose, set, shakeIf, speedLines, tween } from './moves'

/**
 * BEAT 04 — FIRST EXCHANGE (3.2 s).
 * VELOCITY coils (anticipation), explodes off the floor and drives a blade-hand thrust at VOID.
 * VOID phases a frame before contact: its body splits into contradictory positions and the
 * strike passes through it in slow motion. VELOCITY skids out the far side and turns; VOID
 * re-forms, turns and answers with a palm strike — VELOCITY back-flips clear.
 */
export const firstExchangeSegment: PhaseSegment = {
  phase: 'ENGAGE',
  duration: 3.2,
  build(ctx) {
    const { tl, state, at, motion } = ctx
    const R = motion.reduced

    // Anticipation: the crouch, in a low shot behind VELOCITY.
    shot(ctx, 'LOW_PREP', 0)
    pose(ctx, 'velocity', 'crouch', 0, 0.32, 'power2.out')
    tween(ctx, 'velocity', { energy: 1 }, 0, 0.32)
    set(ctx, 'velocity', { trails: 1 }, 0.3)

    // Launch → thrust.
    ctx.cue(CUES.VELOCITY_DASH, 0.36)
    burst(ctx, BURST.DUST, { x: MARKS.velocityHome.x, y: 0.05, z: 0 }, 0.36)
    ctx.cue(CUES.GRID_RIPPLE, 0.36, { x: MARKS.velocityHome.x, z: 0, strength: 0.7 })
    if (R) {
      // One dissolve straight through: the strike is implied, never travelled.
      blink(ctx, 'velocity', MARKS.passThrough, 0.36, 0.25)
      pose(ctx, 'velocity', 'thrust', 0.5, 0.2)
      shot(ctx, 'PHASE_CLOSE', 0.56)
    } else {
      pose(ctx, 'velocity', 'dash', 0.36, 0.07, 'expo.out')
      moveTo(ctx, 'velocity', MARKS.thrustContact, 0.36, 0.2, 'expo.in')
      shot(ctx, 'SIDE_TRACK', 0.39)
      speedLines(ctx, 0.38, 0.22, 0)
      pose(ctx, 'velocity', 'thrust', 0.49, 0.08, 'expo.out')
      shot(ctx, 'PHASE_CLOSE', 0.56)
    }

    // VOID phases a frame before contact; the strike crawls through its split body.
    pose(ctx, 'void', 'phaseLean', 0.5, 0.12, 'power3.out')
    tween(ctx, 'void', { phase: 1 }, 0.51, R ? 0.25 : 0.05, 'expo.out')
    tl.to(state.fx, { lens: 1, duration: 0.06 }, at(0.52))
    ctx.cue(CUES.VOID_PHASE, 0.56)
    burst(ctx, BURST.VOID, { x: MARKS.voidHome.x, y: CHEST, z: 0 }, 0.56, 0.8)
    flash(ctx, 0.56, 0.12, 0.15)
    if (!R) moveTo(ctx, 'velocity', MARKS.passThrough, 0.56, 0.42, 'none')

    // Release on the far side, skid, turn.
    const out = R ? 1.1 : 0.98
    moveTo(ctx, 'velocity', MARKS.skid, out, R ? 0.5 : 0.26, R ? 'sine.inOut' : 'expo.out')
    pose(ctx, 'velocity', 'land', out + 0.02, 0.16, 'power3.out')
    ctx.cue(CUES.VELOCITY_SKID, out + 0.14)
    burst(ctx, BURST.DUST, { x: MARKS.skid.x, y: 0.05, z: MARKS.skid.z }, out + 0.14)
    burst(ctx, BURST.SPARKS, { x: MARKS.skid.x - 0.2, y: 0.05, z: MARKS.skid.z }, out + 0.14, 0.6)
    shot(ctx, 'THREE_Q', out)
    tween(ctx, 'void', { phase: 0 }, out + 0.08, 0.3, 'power2.in')
    tl.to(state.fx, { lens: 0.3, duration: 0.4 }, at(out + 0.1))
    tween(ctx, 'velocity', { yaw: YAW.west }, 1.3, 0.22, 'power3.inOut')
    pose(ctx, 'velocity', 'ready', 1.32, 0.24, 'back.out(1.4)')

    // VOID turns and counters; VELOCITY back-flips clear.
    tween(ctx, 'void', { yaw: YAW.east }, 1.25, 0.3, 'power3.inOut')
    pose(ctx, 'void', 'counter', 1.6, 0.13, 'back.out(1.8)')
    ctx.cue(CUES.VOID_COUNTER, 1.7)
    burst(ctx, BURST.VOID, { x: MARKS.voidHome.x + 0.9, y: CHEST, z: 0 }, 1.7, 1.0)
    shakeIf(ctx, 1.7, 0.25)
    pose(ctx, 'velocity', 'flip', 1.64, 0.1, 'power2.out')
    if (R) {
      arc(ctx, 'velocity', MARKS.dodge, 0.6, 1.64, 0.7)
    } else {
      arc(ctx, 'velocity', MARKS.dodge, 1.25, 1.64, 0.56)
      // Back-flip (negative pitch while facing west).
      tween(ctx, 'velocity', { pitch: -Math.PI * 2 }, 1.64, 0.56, 'power1.inOut')
      set(ctx, 'velocity', { pitch: 0 }, 2.21)
    }
    pose(ctx, 'velocity', 'land', 2.18, 0.1, 'power2.out')
    ctx.cue(CUES.LAND, 2.22)
    burst(ctx, BURST.DUST, { x: MARKS.dodge.x, y: 0.05, z: MARKS.dodge.z }, 2.22, 0.8)
    pose(ctx, 'velocity', 'ready', 2.42, 0.25, 'power2.out')
    pose(ctx, 'void', 'guard', 2.0, 0.4, 'power2.inOut')
    tween(ctx, 'velocity', { energy: 0.7 }, 2.4, 0.5)
    // Reset → coil: the camera leans in while VELOCITY sinks for the next entry.
    shot(ctx, 'THREE_Q_PUSH', 2.45, { duration: 0.75, ease: 'sine.inOut' })
    pose(ctx, 'velocity', 'crouch', 2.85, 0.3, 'power2.inOut')
  },
}
