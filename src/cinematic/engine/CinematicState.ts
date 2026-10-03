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
      reveal: 0,
      assemble: 0,
      energy: 0,
      idle: 0,
      marker: 0,
      readout: 0,
      interference: 0,
    },
    void: {
      position: VOID_HOME.clone(),
      mass: 0,
      radius: 0.42,
      reveal: 0,
      corruption: 0,
      readout: 0,
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
    },
    // The gate starts as a thin slit: the first frames are an eye opening on the origin.
    fx: { gate: 0.07, flash: 0, exposure: 1, bloom: 1 },
  }
}

/** Restores every field of `state` to its initial value in place (references are preserved). */
export function resetCinematicState(state: CinematicState): void {
  const fresh = createCinematicState()
  Object.assign(state.world, fresh.world)
  Object.assign(state.fx, fresh.fx)
  const { position: vp, ...velocity } = fresh.velocity
  Object.assign(state.velocity, velocity)
  state.velocity.position.copy(vp)
  const { position: dp, ...voidRest } = fresh.void
  Object.assign(state.void, voidRest)
  state.void.position.copy(dp)
  const { position: cp, target: ct, ...camera } = fresh.camera
  Object.assign(state.camera, camera)
  state.camera.position.copy(cp)
  state.camera.target.copy(ct)
}

/** Deep copy of the numeric content of a state (used by tests and debug snapshots). */
export function snapshotState(s: CinematicState): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(s, (k, v: unknown) => (k === '_gsap' ? undefined : v instanceof Vector3 ? [v.x, v.y, v.z] : v)),
  ) as Record<string, unknown>
}
