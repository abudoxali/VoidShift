import { Vector3 } from 'three'
import type { CameraMode, EntityId } from '../types'

/**
 * The single mutable state object that the cinematic timeline writes and every
 * rendering system reads. It contains only plain numbers / vectors so GSAP can tween
 * it directly and React never re-renders because of it.
 *
 * Rule: sequences WRITE this object (through the timeline); render components only READ it.
 */
export interface CinematicState {
  world: {
    /** Radius (world units) the computational grid has been revealed to. */
    reveal: number
    /** 0..1 extent of the two origin axis lines drawn during BOOT. */
    axis: number
    /** 0..1 fade of the atmosphere dome and data field. */
    atmosphere: number
    /** 0..1 brightness of the origin marker. */
    origin: number
  }
  velocity: {
    position: Vector3
    /** Yaw (radians) the vector kernel points toward. */
    heading: number
    /** Pitch (radians) of the kernel's nose (dives and climbs). */
    pitch: number
    /** 0..1 global visibility. */
    reveal: number
    /** 0..1 reconstruction of its geometry from scattered fragments. */
    assemble: number
    /** 0..1 kinetic energy (drives brightness, grid response, streak density). */
    energy: number
    /** 0..1 weight of procedural idle micro-motion. */
    idle: number
    /** 0..1 visibility of the target/arrival coordinate marker. */
    marker: number
    /** 0..1 visibility of the telemetry readout. */
    readout: number
    /** 0..1 signal interference applied to the readout (from VOID). */
    interference: number
    /** 0..1 targeting: the precision rings stop spinning and align into a sight along the heading. */
    focus: number
    /** 0..1 enables afterimage capture (short-lived geometric replicas at high speed). */
    ghosts: number
  }
  void: {
    position: Vector3
    /** 0..1 gravitational strength. Space bends before the void is visible. */
    mass: number
    /** World radius of the event horizon. */
    radius: number
    /** 0..1 visibility of the tear (horizon, shell, lens). */
    reveal: number
    /** 0..1 amount of data corruption it emits. */
    corruption: number
    /** 0..1 visibility of its (permanently unresolved) coordinate readout. */
    readout: number
    /**
     * 0..1 PHASE mode: VOID stops behaving like solid space. Its interior turns from absence
     * into folded, re-sampled space; shell fragments jump to mirrored (contradictory)
     * positions across the attack plane; its coordinates stop resolving.
     */
    phase: number
    /** 0..1 spatial split: space parts along the attack line (shell halves, horizon, grid seam). */
    fold: number
    /** 0..1 field inversion: gravity pushes outward (grid bulges, data is expelled). */
    inversion: number
    /** 0..1 directional desynchronisation of the image along the attack vector (chroma). */
    desync: number
  }
  /** The current attack vector: prediction geometry, lock data and outcome. */
  attack: {
    /** Launch point of the predicted trajectory. */
    from: Vector3
    /** End of the predicted trajectory (beyond the intercept). */
    to: Vector3
    /** 0..1 draw progress of the trajectory geometry. */
    draw: number
    /** 0..1 visibility of trajectory + intercept marker. */
    visible: number
    /** 0..1 decode of the lock telemetry. */
    lock: number
    /** 0..1 reveal of the outcome ("COLLISION FALSE"). */
    result: number
    /** Exchange number (0 = none, 1 = first attack, 2 = second). */
    index: number
  }
  camera: {
    mode: CameraMode
    position: Vector3
    target: Vector3
    fov: number
    roll: number
    /** Entity the target is blended toward with `trackWeight`. */
    track: EntityId
    trackWeight: number
    /** Exponential-damping rate of the rig (1/s). 0 = hard cut (FREEZE). */
    lag: number
    /** Handheld/breathing drift amplitude. */
    breathe: number
    /** 0..1 how much 16:9 fit-width adaptation applies (portrait-authored shots use 0). */
    fit: number
    /** Look-ahead (world units) along the tracked entity's motion (CHASE). */
    lead: number
  }
  fx: {
    /** 0..1 how far the cinematic letterbox gate has opened. */
    gate: number
    /** Additive white flash (0..1). */
    flash: number
    /** Multiplicative exposure (1 = neutral). Values < 1 = light pulled into the void. */
    exposure: number
    /** 0..1 bloom response multiplier. */
    bloom: number
  }
}

export const VELOCITY_HOME = new Vector3(-3.4, 1.15, 0.2)
export const VOID_HOME = new Vector3(3.5, 1.55, -1.1)

export function createCinematicState(): CinematicState {
  return {
    world: { reveal: 0, axis: 0, atmosphere: 0, origin: 0 },
    velocity: {
      position: new Vector3(-30, 2.2, -8),
      heading: 0,
      pitch: 0,
      reveal: 0,
      assemble: 0,
      energy: 0,
      idle: 0,
      marker: 0,
      readout: 0,
      interference: 0,
      focus: 0,
      ghosts: 0,
    },
    void: {
      position: VOID_HOME.clone(),
      mass: 0,
      radius: 0.42,
      reveal: 0,
      corruption: 0,
      readout: 0,
      phase: 0,
      fold: 0,
      inversion: 0,
      desync: 0,
    },
    attack: {
      from: VELOCITY_HOME.clone(),
      to: VOID_HOME.clone(),
      draw: 0,
      visible: 0,
      lock: 0,
      result: 0,
      index: 0,
    },
    camera: {
      mode: 'FREEZE',
      position: new Vector3(0.55, 0.32, 2.4),
      target: new Vector3(0, 0, 0),
      fov: 26,
      roll: 0,
      track: 'origin',
      trackWeight: 0,
      lag: 0,
      breathe: 0,
      fit: 1,
      lead: 0,
    },
    // The gate starts as a thin slit: the first frames are an eye opening on the origin.
    fx: { gate: 0.07, flash: 0, exposure: 1, bloom: 1 },
  }
}

/** Restores every field of `state` to its initial value in place (object references are preserved). */
export function resetCinematicState(state: CinematicState): void {
  const fresh = createCinematicState() as unknown as Record<string, Record<string, unknown>>
  const target = state as unknown as Record<string, Record<string, unknown>>
  for (const group of Object.keys(fresh)) {
    for (const [key, value] of Object.entries(fresh[group])) {
      const current = target[group][key]
      if (value instanceof Vector3 && current instanceof Vector3) current.copy(value)
      else target[group][key] = value
    }
  }
}

/** Deep copy of the numeric content of a state (used by tests and debug snapshots). */
export function snapshotState(s: CinematicState): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(s, (k, v: unknown) => (k === '_gsap' ? undefined : v instanceof Vector3 ? [v.x, v.y, v.z] : v)),
  ) as Record<string, unknown>
}
