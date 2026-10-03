import { Vector3 } from 'three'
import { VELOCITY_HOME, VOID_HOME } from '../engine/CinematicState'
import { ATTACK_1, ATTACK_2, toTuple } from '../engine/staging'
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
  /** 0..1 fit-width adaptation (default 1). Portrait-authored variants use 0. */
  readonly fit?: number
  /** CHASE look-ahead along the tracked entity's motion (world units). */
  readonly lead?: number
  /** Portrait composition: overrides applied when the timeline is compiled for portrait. */
  readonly portrait?: Partial<Omit<ShotPreset, 'portrait'>>
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
    // Portrait: look down the line between them — the separation becomes vertical.
    portrait: { position: [-11, 5.4, 4.8], target: [0.3, 0.9, -0.6], fov: 46 },
  },

  // ── ENGAGE / PHASE ────────────────────────────────────────────────────────
  /** Tension creep: the two-shot tightens while nothing moves. */
  STANDOFF_PUSH: {
    mode: 'ESTABLISH',
    position: [0.3, 1.8, 10.2],
    target: [0.05, 1.25, -0.45],
    fov: 33,
    lag: 1.2,
    breathe: 0.3,
    portrait: { position: [-9.8, 4.7, 4.1], target: [0.4, 1.0, -0.6], fov: 44 },
  },
  /** Over-the-shoulder down the predicted vector: the camera commits to the attack line. */
  ENGAGE_LINEUP: {
    mode: 'TRACK',
    position: toTuple(at(VELOCITY_HOME, ATTACK_1.dir, -4.4).add(new Vector3(0, 1.1, 2.3))),
    target: toTuple(VOID_HOME),
    fov: 30,
    roll: -0.02,
    lag: 2.4,
    breathe: 0.2,
    portrait: { position: toTuple(at(VELOCITY_HOME, ATTACK_1.dir, -3.6).add(new Vector3(0, 1.6, 0.9))), fov: 44 },
  },
  /** CHASE: rides behind the vector, looks ahead of it, FOV opens with speed. */
  ATTACK_CHASE: {
    mode: 'CHASE',
    position: [-1.7, 0.5, 1.25],
    target: toTuple(VOID_HOME),
    fov: 46,
    track: 'velocity',
    trackWeight: 1,
    lead: 1.6,
    lag: 7,
    breathe: 0,
    portrait: { position: [-2.2, 0.9, 0.7], fov: 54 },
  },
  /** Hero insert: side-on at the core while the vector crawls through dilated space. */
  INTERSECTION: {
    mode: 'FREEZE',
    position: toTuple(at(VOID_HOME, ATTACK_1.side, 4.3).add(new Vector3(0, 0.55, 0))),
    target: toTuple(VOID_HOME),
    fov: 32,
    lag: 0,
    breathe: 0,
    portrait: { position: toTuple(at(VOID_HOME, ATTACK_1.side, 5.2).add(new Vector3(0, 1.3, 0))), fov: 50 },
  },
  INTERSECTION_PUSH: {
    mode: 'FREEZE',
    position: toTuple(at(VOID_HOME, ATTACK_1.side, 3.7).add(new Vector3(0, 0.45, 0))),
    target: toTuple(at(VOID_HOME, ATTACK_1.dir, 0.25)),
    fov: 30,
    lag: 0,
    breathe: 0,
    portrait: { position: toTuple(at(VOID_HOME, ATTACK_1.side, 4.6).add(new Vector3(0, 1.2, 0))), fov: 48 },
  },
  /** The camera resolves what happened: from beyond the exit, looking back at an intact VOID. */
  RECOVERY: {
    mode: 'ESTABLISH',
    position: [10.2, 2.5, 3.2],
    target: [4.8, 1.5, -1.25],
    fov: 38,
    lag: 1.8,
    breathe: 0.35,
    portrait: { position: toTuple(at(ATTACK_1.exit, ATTACK_1.dir, 4.2).add(new Vector3(0, 2.6, 0.8))), target: [3.9, 1.3, -1.0], fov: 46 },
  },
  /** The tactical problem, from above: the adapted vector set against the core. */
  SECOND_SETUP: {
    mode: 'ESTABLISH',
    position: [-1.2, 5.0, 10.2],
    target: [3.9, 2.2, -0.6],
    fov: 40,
    lag: 1.5,
    breathe: 0.3,
    portrait: { position: toTuple(at(ATTACK_2.origin, ATTACK_2.dir, -3.4).add(new Vector3(0, 1.2, 0))), target: toTuple(VOID_HOME), fov: 48 },
  },
  /**
   * Hero for the second pass: looking down across the attack line, so the split (which opens
   * perpendicular to the line) reads across the frame and the vector visibly uses the gap.
   */
  SPLIT_HERO: {
    mode: 'FREEZE',
    position: toTuple(at(VOID_HOME, ATTACK_2.up, 4.8).addScaledVector(ATTACK_2.dir, -1.5)),
    target: toTuple(at(VOID_HOME, ATTACK_2.dir, 0.6)),
    fov: 38,
    lag: 0,
    breathe: 0,
    portrait: { position: toTuple(at(VOID_HOME, ATTACK_2.up, 7.6).addScaledVector(ATTACK_2.dir, -1.2)), fov: 54 },
  },
  /** Held tension after two failed exchanges: the core intact, the vector behind it. */
  FINAL_TENSION: {
    mode: 'ORBIT',
    position: [2.6, 1.6, 9.6],
    target: [2.4, 1.15, -1.7],
    fov: 34,
    lag: 1.2,
    breathe: 0.5,
    portrait: { position: [1.0, 5.6, 9.0], target: [2.3, 1.0, -1.9], fov: 46 },
  },
} as const satisfies Record<string, ShotPreset>

function at(base: Vector3, dir: Vector3, d: number): Vector3 {
  return base.clone().addScaledVector(dir, d)
}

export type ShotName = keyof typeof SHOTS
