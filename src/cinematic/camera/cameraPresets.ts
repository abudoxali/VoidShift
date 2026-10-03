import type { CameraMode, EntityId } from '../types'

export type Vec3Tuple = readonly [number, number, number]

/**
 * A shot is a complete camera intention: where it is, what it frames, how it behaves.
 * For CHASE shots `position` is an offset from the tracked entity.
 */
export interface ShotPreset {
  readonly mode: CameraMode
  readonly position: Vec3Tuple
  readonly target: Vec3Tuple
  readonly fov: number
  readonly roll?: number
  readonly track?: EntityId
  readonly trackWeight?: number
  /** Rig damping rate (1/s). Lower = heavier, more cinematic lag. */
  readonly lag: number
  readonly breathe: number
}

/**
 * Shot library for the foundation sequence. Compositions are designed at 16:9 and
 * adapted to other aspect ratios by `computeFraming`.
 *
 * Reference-derived intent: long held shots with slow drift, tight inserts before
 * violent action, and a wide two-shot with large negative space between the entities.
 */
export const SHOTS = {
  /** Macro on the world origin: the first coordinate that exists. */
  BOOT_ORIGIN: {
    mode: 'FREEZE',
    position: [0.55, 0.32, 2.4],
    target: [0, 0, 0],
    fov: 26,
    lag: 0,
    breathe: 0,
  },
  /** Crane up and back as the grid propagates outward. */
  REVEAL_CRANE: {
    mode: 'REVEAL',
    position: [1.6, 3.4, 12.5],
    target: [0, 0.4, -2],
    fov: 40,
    lag: 2.2,
    breathe: 0.4,
  },
  /** Low, slightly tilted framing of the arrival coordinate, leaving space for the incoming streak. */
  VELOCITY_ARRIVAL: {
    mode: 'TRACK',
    position: [-0.6, 0.85, 5.6],
    target: [-3.1, 1.15, 0.2],
    fov: 33,
    roll: -0.035,
    lag: 3.2,
    breathe: 0.35,
  },
  /** Tight insert on the place where space starts to fail. */
  VOID_INSERT: {
    mode: 'TRACK',
    position: [1.25, 1.75, 4.1],
    target: [3.3, 1.45, -1.1],
    fov: 29,
    roll: 0.03,
    track: 'void',
    trackWeight: 0.5,
    lag: 1.6,
    breathe: 0.25,
  },
  /** Wide two-shot: both forces, held apart by empty computational space. */
  STANDOFF: {
    mode: 'ORBIT',
    position: [0, 2.0, 12.2],
    target: [0.05, 1.2, -0.45],
    fov: 35,
    lag: 1.4,
    breathe: 0.55,
  },
} as const satisfies Record<string, ShotPreset>

export type ShotName = keyof typeof SHOTS
