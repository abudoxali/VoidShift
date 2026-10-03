import { shake, shot } from '../../camera/shot'
import { CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { ATTACK_1, pitchTowards, yawTowards } from '../../engine/staging'
import { moveTo, publishVector, reconstructAt } from './moves'

/** Local time the attack leaves the wind-up. ENGAGE ends as it reaches the VOID's volume. */
export const ENGAGE_LAUNCH = 4.45
export const ENGAGE_DURATION = 4.6

/**
 * ENGAGE — stillness → decision → impossible speed.
 *
 *  0.0  the standoff holds; VELOCITY's micro-motion stops (a decision is being made)
 *  0.6  the two-shot tightens, slowly
 *  1.3  VECTOR LOCK: the precision rings stop spinning and align into a sight
 *  1.8  the predicted trajectory is drawn through the VOID core, with intercept marker
 *  2.6  the camera commits to the line (over-the-shoulder)
 *  3.9  wind-up: a short pull-back against the direction of attack
 *  4.45 launch: ~0.15 s expo-in acceleration; the camera is thrown into CHASE
 *  4.53 the VOID phases a frame before contact — it is already not there
 */
export const engageSegment: PhaseSegment = {
  phase: 'ENGAGE',
  duration: ENGAGE_DURATION,
  build(ctx) {
    const { tl, state, at, motion } = ctx
    const v = state.velocity
    const a = state.attack
    const vd = state.void

    // Silence.
    tl.to(v, { idle: 0, duration: 0.6, ease: 'power2.out' }, at(0.3))
    shot(ctx, 'STANDOFF_PUSH', 0.6, { duration: 2.2, ease: 'sine.inOut' })

    // Targeting.
    ctx.cue(CUES.VELOCITY_LOCK, 1.3)
    publishVector(ctx, 1, ATTACK_1.origin, ATTACK_1.predictedEnd, 1.3)
    tl.to(v, { focus: 1, energy: 0.8, duration: 0.55, ease: 'power3.inOut' }, at(1.3))
    tl.to(v, { heading: yawTowards(ATTACK_1.dir.x, ATTACK_1.dir.z), pitch: pitchTowards(ATTACK_1.dir), duration: 0.4, ease: 'power3.inOut' }, at(1.3))
    tl.to(a, { visible: 1, duration: 0.2 }, at(1.75))
    tl.to(a, { draw: 1, duration: 0.6, ease: 'expo.out' }, at(1.8))
    tl.to(a, { lock: 1, duration: 0.7, ease: 'none' }, at(2.0))

    // Commit.
    shot(ctx, 'ENGAGE_LINEUP', 2.6, { duration: 1.15, ease: 'power3.inOut' })
    tl.to(vd, { phase: 0.1, duration: 1.2, ease: 'power1.in' }, at(2.8))

    if (motion.reduced) {
      // Same beats, no speed: the vector re-materialises at the edge of the volume.
      tl.to(v, { energy: 1, duration: 0.6 }, at(3.6))
      ctx.cue(CUES.VELOCITY_LAUNCH, ENGAGE_LAUNCH - 0.45)
      reconstructAt(ctx, ATTACK_1.entry, ENGAGE_LAUNCH - 0.45, 0.32)
      tl.to(vd, { phase: 1, duration: 0.5, ease: 'power2.inOut' }, at(ENGAGE_LAUNCH - 0.3))
      tl.to(v, { focus: 0, duration: 0.4 }, at(ENGAGE_LAUNCH - 0.3))
      return
    }

    // Wind-up.
    moveTo(ctx, ATTACK_1.windup, 3.9, 0.45, 'power2.out')
    tl.to(v, { energy: 1, duration: 0.45, ease: 'power2.in' }, at(3.9))

    // Launch.
    ctx.cue(CUES.VELOCITY_LAUNCH, ENGAGE_LAUNCH)
    ctx.cue(CUES.GRID_RIPPLE, ENGAGE_LAUNCH, { x: ATTACK_1.windup.x, z: ATTACK_1.windup.z, strength: 0.6 })
    tl.set(v, { ghosts: 1 }, at(ENGAGE_LAUNCH - 0.02))
    moveTo(ctx, ATTACK_1.entry, ENGAGE_LAUNCH, ENGAGE_DURATION - ENGAGE_LAUNCH, 'expo.in')
    tl.to(v, { focus: 0, duration: 0.12, ease: 'power2.in' }, at(ENGAGE_LAUNCH))
    shot(ctx, 'ATTACK_CHASE', ENGAGE_LAUNCH - 0.03, { duration: 0.16, ease: 'power2.in' })
    shake(ctx, ENGAGE_LAUNCH, 0.18)

    // The VOID phases a frame before contact: the deception is spatial, not temporal.
    tl.to(vd, { phase: 1, duration: 0.07, ease: 'expo.out' }, at(ENGAGE_DURATION - 0.07))
  },
}
