import { shake, shot } from '../../camera/shot'
import { VELOCITY_HOME, VOID_HOME } from '../../engine/CinematicState'
import { CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'

/** Point far off-frame the dash originates from. */
const DASH_ORIGIN = { x: -30, y: 2.2, z: -8 }

/** Yaw that makes the kernel's local +X point along (dx, dz). */
const yawTowards = (dx: number, dz: number) => Math.atan2(-dz, dx)

/**
 * SPAWN — the two forces enter the world.
 *
 * VELOCITY: its arrival coordinate is published first (the anchor), a held beat, then it
 * crosses the world in ~0.25s and decelerates to a dead stop; its geometry reconstructs
 * around the arrival point.
 *
 * VOID: it is never seen arriving. Space bends first (grid sags, data drifts, readouts
 * corrupt), the world inhales, then the tear opens in a single violent frame.
 *
 * The phase ends on a wide two-shot held in tension.
 */
export const spawnSegment: PhaseSegment = {
  phase: 'SPAWN',
  duration: 11.6,
  build(ctx) {
    const { tl, state, at, motion } = ctx
    const v = state.velocity
    const vd = state.void
    const fx = state.fx

    // ── VELOCITY ────────────────────────────────────────────────────────────
    shot(ctx, 'VELOCITY_ARRIVAL', 0, { duration: 1.7, ease: 'power2.inOut' })
    tl.to(v, { marker: 1, duration: 0.35, ease: 'power2.out' }, at(0.8))
    ctx.cue(CUES.VELOCITY_TARGET, 0.8)

    const dash = 2.4
    const arrive = motion.reduced ? dash : dash + 0.1
    if (motion.reduced) {
      tl.set(v.position, { x: VELOCITY_HOME.x, y: VELOCITY_HOME.y, z: VELOCITY_HOME.z }, at(dash))
      tl.set(v, { heading: yawTowards(1, 0) }, at(dash))
      tl.to(v, { reveal: 1, energy: 0.55, duration: 0.8, ease: 'power1.out' }, at(dash))
      tl.to(v, { assemble: 1, duration: 1.4, ease: 'power2.out' }, at(dash))
    } else {
      // Becomes visible a beat before moving (still far off-frame) so the very first frame
      // of the dash already reads as motion rather than as a placement.
      tl.set(v, { reveal: 1, energy: 1, heading: yawTowards(VELOCITY_HOME.x - DASH_ORIGIN.x, VELOCITY_HOME.z - DASH_ORIGIN.z) }, at(dash - 0.05))
      tl.to(v.position, { x: VELOCITY_HOME.x, y: VELOCITY_HOME.y, z: VELOCITY_HOME.z, duration: 0.26, ease: 'expo.out' }, at(dash))
      ctx.cue(CUES.VELOCITY_DASH, dash)
      // A 2-frame flash cut, as in the reference's teleport beat.
      tl.to(fx, { flash: 0.22 * motion.flash, duration: 0.033 }, at(dash))
      tl.to(fx, { flash: 0, duration: 0.28, ease: 'power2.out' }, at(dash + 0.033))
      tl.to(v, { assemble: 1, duration: 0.8, ease: 'expo.out' }, at(arrive))
      tl.to(v, { energy: 0.55, duration: 1.3, ease: 'power2.out' }, at(arrive))
      tl.to(v, { heading: yawTowards(1, 0), duration: 0.9, ease: 'power3.inOut' }, at(arrive + 0.25))
      shake(ctx, arrive, 0.5)
    }
    ctx.cue(CUES.VELOCITY_ARRIVE, arrive)
    ctx.cue(CUES.GRID_RIPPLE, arrive, { x: VELOCITY_HOME.x, z: VELOCITY_HOME.z, strength: 1 })
    tl.to(v, { marker: 0, duration: 0.25, ease: 'power2.in' }, at(arrive + 0.05))
    tl.to(v, { readout: 1, duration: 0.5, ease: 'power2.out' }, at(arrive + 0.4))
    tl.to(v, { idle: 1, duration: 1.0, ease: 'power1.inOut' }, at(arrive + 0.7))

    // Controlled pause: ~1s of near stillness before anything else happens.

    // ── VOID ────────────────────────────────────────────────────────────────
    const stir = 4.2
    shot(ctx, 'VOID_INSERT', stir, { duration: 2.8, ease: 'sine.inOut' })
    ctx.cue(CUES.VOID_STIR, stir)
    tl.to(vd, { mass: 0.32, duration: 2.6, ease: 'power1.in' }, at(stir))
    tl.to(vd, { corruption: 0.35, duration: 1.0, ease: 'power1.in' }, at(stir + 0.8))
    tl.to(vd, { readout: 0.6, duration: 0.3 }, at(stir + 1.2))

    const toVoid = yawTowards(VOID_HOME.x - VELOCITY_HOME.x, VOID_HOME.z - VELOCITY_HOME.z)
    tl.to(v, { heading: toVoid, duration: 0.5, ease: 'power3.inOut' }, at(stir + 1.4))
    tl.to(v, { interference: 0.6, duration: 0.4 }, at(stir + 1.4))
    tl.to(v, { interference: 0.15, duration: 0.6 }, at(stir + 2.2))

    // Inhale — the world is pulled tight for a beat.
    const tear = 7.0
    tl.to(vd, { mass: 0.22, duration: 0.4, ease: 'power2.in' }, at(tear - 0.4))
    tl.to(fx, { exposure: 0.9, duration: 0.4, ease: 'power2.in' }, at(tear - 0.4))

    // Tear.
    ctx.cue(CUES.VOID_OPEN, tear)
    ctx.cue(CUES.GRID_RIPPLE, tear, { x: VOID_HOME.x, z: VOID_HOME.z, strength: 1.3 })
    shake(ctx, tear, 0.75)
    const tearIn = motion.reduced ? 1.0 : 0.16
    tl.to(vd, { mass: 1, duration: tearIn, ease: 'expo.out' }, at(tear))
    tl.to(vd, { reveal: 1, duration: motion.reduced ? 1.0 : 0.28, ease: 'expo.out' }, at(tear))
    tl.to(vd, { corruption: 1, duration: 0.1 }, at(tear))
    tl.to(vd, { corruption: 0.55, duration: 1.4, ease: 'power2.out' }, at(tear + 0.1))
    tl.to(vd, { readout: 1, duration: 0.2 }, at(tear + 0.1))
    tl.to(fx, { exposure: 1 - 0.45 * motion.flash, duration: 0.05 }, at(tear))
    tl.to(fx, { exposure: 1, duration: 1.1, ease: 'power2.out' }, at(tear + 0.05))

    // ── STANDOFF ────────────────────────────────────────────────────────────
    const standoff = 8.6
    tl.to(v, { interference: 0, duration: 1.0 }, at(standoff))
    shot(ctx, 'STANDOFF', standoff, { duration: 2.8, ease: 'power3.inOut' })
  },
}
