import { Vector3 } from 'three'
import { facing } from '../../engine/CinematicState'

/**
 * Stage marks for the fight (world units, floor at y = 0). AERON (engine `velocity`) enters on
 * the left facing +X; NOX (`void`) holds the right facing -X. Strike marks are derived from the
 * pose library (see the probes in the choreography tests): e.g. AERON's cross lands 0.93 m in
 * front of his feet at chest height, so he punches from 0.68 to pass through NOX's chest.
 */
export const MARKS = {
  aeronHome: new Vector3(-2.0, 0, 0),
  noxHome: new Vector3(1.6, 0, 0),
  /** First attack: the punch stance (fist through NOX's upper torso). */
  punch: new Vector3(0.68, 0, 0),
  /** Ducking slides AERON back a little: the kick needs room. */
  duck: new Vector3(0.5, 0, 0.02),
  /** NOX's grab lunge, and where AERON spins out to. */
  noxLunge: new Vector3(1.38, 0, 0),
  rotateOut: new Vector3(0.42, 0, -0.62),
  /** The step in before the hook kick. */
  kickFrom: new Vector3(0.62, 0, -0.42),
  /** Failed strategy: backing off. */
  reset: new Vector3(-0.2, 0, -0.05),
  /** Anchor: released from the hand, passing NOX's head, planted behind him. */
  anchorRelease: new Vector3(0.33, 1.57, 0.29),
  anchorPass: new Vector3(1.6, 1.68, -0.32),
  anchorPlant: new Vector3(3.0, 0.2, -0.45),
  /** Second attack: AERON drives into NOX and comes apart. */
  dashInto: new Vector3(1.3, 0, -0.02),
  /** Reconstruction above the anchor, then above / behind NOX for the Core. */
  reconstruct: new Vector3(3.0, 1.0, -0.45),
  above: new Vector3(2.32, 1.15, -0.06),
  /** The drive ends with the core on NOX's upper back (see tests: strike contact). */
  slam: new Vector3(2.15, 0.76, -0.59),
  contact: new Vector3(1.75, 1.32, 0),
  /** After the impact. */
  noxDown: new Vector3(1.2, 0, 0.05),
  aeronLanding: new Vector3(3.0, 0, 0.5),
} as const

export const YAW = {
  /** Facing +X (toward NOX from the left). */
  east: facing(1, 0),
  /** Facing -X. */
  west: facing(-1, 0),
} as const

/** Chest height used for bursts at a fighter. */
export const CHEST = 1.3
