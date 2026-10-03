import { Vector3 } from 'three'
import { STAGE, facing } from '../../engine/CinematicState'

/** Stage marks for the intro fight (world units, floor at y = 0). */
export const MARKS = {
  velocityHome: STAGE.velocityHome,
  voidHome: STAGE.voidHome,
  /** First exchange: thrust contact, the far side of VOID, the skid stop, the dodge landing. */
  thrustContact: new Vector3(1.35, 0, 0),
  passThrough: new Vector3(2.95, 0, 0),
  skid: new Vector3(4.45, 0, 0.1),
  dodge: new Vector3(5.7, 0, 0.1),
  /** Close combat. */
  closeRange: new Vector3(3.2, 0, 0.05),
  voidSidestep: new Vector3(2.3, 0, -0.75),
  vaultLanding: new Vector3(0.95, 0, -0.2),
  /** Teleport. */
  anchorPlant: new Vector3(4.95, 0.02, -0.45),
  anchorRelease: new Vector3(1.3, 1.45, -0.35),
  voidHead: new Vector3(2.3, 1.6, -0.05),
  feint: new Vector3(1.7, 0, -0.1),
  /** Code Core: inverted above VOID's back, then the slam. */
  above: new Vector3(2.95, 2.1, 0.12),
  /** Pivot position at the end of the strike: puts the striking hand on VOID's upper back. */
  slam: new Vector3(2.82, 1.4, 0.3),
  contact: new Vector3(2.5, 1.45, 0),
  recoilTo: new Vector3(1.55, -0.12, 0),
  heroLanding: new Vector3(4.15, 0, 0.55),
} as const

export const YAW = {
  /** Facing +X (toward VOID from the left). */
  east: facing(1, 0),
  /** Facing -X. */
  west: facing(-1, 0),
} as const

/** Chest height used for bursts at a fighter. */
export const CHEST = 1.25
