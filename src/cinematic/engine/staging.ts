import { Vector3 } from 'three'
import { VELOCITY_HOME, VOID_HOME } from './CinematicState'

/**
 * Spatial staging of the first combat exchange. Every point is derived from the two home
 * positions, so choreography, camera shots and tests agree on one geometry.
 */

const UP = new Vector3(0, 1, 0)
const VOID_R = 0.42

/** Unit direction and the horizontal perpendicular (camera-side) of an attack line. */
function frame(from: Vector3, to: Vector3) {
  const dir = to.clone().sub(from).normalize()
  const side = new Vector3().crossVectors(dir, UP).normalize()
  /** Perpendicular to both the line and its split axis: the axis a split is seen across. */
  const up = new Vector3().crossVectors(side, dir).normalize()
  return { dir, side, up }
}

const at = (base: Vector3, dir: Vector3, d: number) => base.clone().addScaledVector(dir, d)

/** First exchange: a straight vector from VELOCITY's home through the VOID core. */
const d1 = frame(VELOCITY_HOME, VOID_HOME)
export const ATTACK_1 = {
  dir: d1.dir,
  side: d1.side,
  origin: VELOCITY_HOME.clone(),
  /** Anticipation pull-back. */
  windup: at(VELOCITY_HOME, d1.dir, -0.45),
  /** Edge of the distortion volume, reached at peak speed. */
  entry: at(VOID_HOME, d1.dir, -VOID_R * 1.5),
  /** Far edge of the volume after the dilated crawl through it. */
  inner: at(VOID_HOME, d1.dir, VOID_R * 1.5),
  /** Where the hard deceleration ends. */
  exit: at(VOID_HOME, d1.dir, 3.5),
  /** Overshoot settle. */
  settle: at(VOID_HOME, d1.dir, 3.2),
  /** End of the predicted trajectory (drawn past the intercept). */
  predictedEnd: at(VOID_HOME, d1.dir, 4.6),
}

/** Second exchange: the adapted vector, from above and in front, diving through the core. */
const ORIGIN_2 = new Vector3(7.4, 4.1, 2.3)
const d2 = frame(ORIGIN_2, VOID_HOME)
export const ATTACK_2 = {
  dir: d2.dir,
  side: d2.side,
  up: d2.up,
  origin: ORIGIN_2,
  windup: at(ORIGIN_2, d2.dir, -0.4),
  entry: at(VOID_HOME, d2.dir, -VOID_R * 1.5),
  exit: at(VOID_HOME, d2.dir, 3.1),
  settle: at(VOID_HOME, d2.dir, 3.1).add(new Vector3(-0.25, 0.7, -0.1)),
  predictedEnd: at(VOID_HOME, d2.dir, 4.0),
}

/** Yaw that makes the kernel's local +X point along (dx, dz). */
export const yawTowards = (dx: number, dz: number): number => Math.atan2(-dz, dx)

/** Pitch (rotation about the kernel's local Z) that tilts its nose along a direction. */
export const pitchTowards = (dir: Vector3): number => Math.asin(Math.max(-1, Math.min(1, dir.y)))

export const toTuple = (v: Vector3): [number, number, number] => [v.x, v.y, v.z]
