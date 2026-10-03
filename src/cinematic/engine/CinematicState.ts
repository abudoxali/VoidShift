import { Vector3 } from 'three'
import type { CameraMode, EntityId } from '../types'

/**
 * The single mutable state object that the cinematic timeline writes and every rendering
 * system reads. Only plain numbers / strings / vectors, so GSAP can tween it directly and React
 * never re-renders because of it.
 *
 * Rule: sequences WRITE this object (through the timeline); render components only READ it.
 */

/** One fighter: world transform, pose transition and material/FX drives. */
export interface FighterState {
  position: Vector3
  /** Facing (radians about +Y). The rig faces +Z at yaw 0. */
  yaw: number
  /** Body pitch (flips, inverted dives). */
  pitch: number
  roll: number
  /** Current target pose and the pose being blended from. */
  pose: string
  from: string
  /** 0..1 blend from `from` to `pose`. */
  blend: number
  /** 0..1 materialisation (dissolve threshold). */
  reveal: number
  /** 0..1 emissive / light drive. */
  energy: number
  /** 0..1 spatial desync: VOID's phase (fragmented body, echoes), VELOCITY's teleport scatter. */
  phase: number
  /** 0..1 limb trails / afterimage emission. */
  trails: number
  /** 0..1 hit shudder. */
  hit: number
  /** 0..1 breathing amplitude. */
  breath: number
}

export interface CinematicState {
  world: {
    /** Radius (world units) the floor lattice has been revealed to. */
    reveal: number
    /** 0..1 extent of the origin axes drawn in the dark opening. */
    axis: number
    /** 0..1 atmosphere dome / data field. */
    atmosphere: number
    /** 0..1 reveal of the dimensional structures (monoliths, slabs). */
    structures: number
    /** 0..1 gravity well under VOID (bends floor + data). */
    voidField: number
  }
  fighters: {
    velocity: FighterState
    void: FighterState
  }
  /** VELOCITY's teleport anchor (a thrown coordinate beacon). */
  anchor: {
    position: Vector3
    spin: number
    /** 0..1 visibility. */
    visible: number
    /** 0..1 planted: light pillar + ground ring. */
    planted: number
    /** 0..1 extra pulse (camera notices it; teleport target). */
    glow: number
  }
  /** The Code Core in VELOCITY's striking hand. */
  core: {
    /** 0..1 formation / charge. */
    charge: number
    /** 0..1 overload just before contact. */
    overload: number
  }
  impact: {
    position: Vector3
    /** Seconds since contact (-1 before). Drives the deterministic debris simulation. */
    age: number
    /** 0..1 light burst. */
    light: number
    /** 0..1 ground shockwave progress. */
    shock: number
    /** 0..1 crater depth + cracks. */
    crater: number
    /** 0..1 aftermath haze. */
    smoke: number
  }
  lights: {
    ambient: number
    key: number
    rimVelocity: number
    rimVoid: number
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
    /** Multiplicative exposure (1 = neutral). */
    exposure: number
    /** 0..1 bloom response multiplier. */
    bloom: number
    /** 0..1 impact frame: inverted, high-contrast graphic frame. */
    invert: number
    /** 0..1 directional speed lines; `speedAngle` is their screen direction (radians). */
    speed: number
    speedAngle: number
    /** 0..1 radial burst rays from the impact point. */
    radial: number
    /** 0..1 local distortion field around VOID (lens + desync while phasing). */
    lens: number
  }
}

/** Stage marks (world units). Both fighters stand on the floor (y = 0). */
export const STAGE = {
  velocityHome: new Vector3(-2.3, 0, 0),
  voidHome: new Vector3(2.3, 0, 0),
} as const

/** Yaw that makes a fighter face along (dx, dz). */
export const facing = (dx: number, dz: number): number => Math.atan2(dx, dz)

function fighter(position: Vector3, yaw: number, pose: string): FighterState {
  return {
    position,
    yaw,
    pitch: 0,
    roll: 0,
    pose,
    from: pose,
    blend: 1,
    reveal: 0,
    energy: 0,
    phase: 0,
    trails: 0,
    hit: 0,
    breath: 1,
  }
}

export function createCinematicState(): CinematicState {
  return {
    world: { reveal: 0, axis: 0, atmosphere: 0, structures: 0, voidField: 0 },
    fighters: {
      velocity: fighter(STAGE.velocityHome.clone(), facing(1, 0), 'assemble'),
      void: fighter(STAGE.voidHome.clone(), facing(-1, 0), 'hunch'),
    },
    anchor: { position: new Vector3(0, -5, 0), spin: 0, visible: 0, planted: 0, glow: 0 },
    core: { charge: 0, overload: 0 },
    impact: { position: STAGE.voidHome.clone(), age: -1, light: 0, shock: 0, crater: 0, smoke: 0 },
    lights: { ambient: 0, key: 0, rimVelocity: 0, rimVoid: 0 },
    camera: {
      mode: 'FREEZE',
      position: new Vector3(0, 0.45, 7),
      target: new Vector3(0, 0.5, 0),
      fov: 30,
      roll: 0,
      track: 'origin',
      trackWeight: 0,
      lag: 0,
      breathe: 0,
      fit: 1,
      lead: 0,
    },
    // The gate starts as a thin slit: the first frames are an eye opening.
    fx: { gate: 0.07, flash: 0, exposure: 1, bloom: 1, invert: 0, speed: 0, speedAngle: 0, radial: 0, lens: 0 },
  }
}

/** Restores every field of `state` to its initial value in place (object references are preserved). */
export function resetCinematicState(state: CinematicState): void {
  const fresh = createCinematicState()
  const copy = (target: Record<string, unknown>, source: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(source)) {
      const current = target[key]
      if (value instanceof Vector3 && current instanceof Vector3) current.copy(value)
      else if (value && typeof value === 'object' && current && typeof current === 'object') copy(current as Record<string, unknown>, value as Record<string, unknown>)
      else target[key] = value
    }
  }
  copy(state as unknown as Record<string, unknown>, fresh as unknown as Record<string, unknown>)
}

/** Deep copy of the numeric content of a state (used by tests and debug snapshots). */
export function snapshotState(s: CinematicState): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(s, (k, v: unknown) => (k === '_gsap' ? undefined : v instanceof Vector3 ? [v.x, v.y, v.z] : v)),
  ) as Record<string, unknown>
}
