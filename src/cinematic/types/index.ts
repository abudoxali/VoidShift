/**
 * Canonical cinematic vocabulary shared by the engine, sequences, store and UI.
 */

/**
 * Every state of the full VoidShift intro, in narrative order.
 * Milestone 01 choreographs BOOT → REVEAL → SPAWN; the rest are reserved so that later
 * milestones only add sequence segments — no engine or store changes are required.
 */
export const CINEMATIC_PHASES = [
  'BOOT',
  'REVEAL',
  'SPAWN',
  'ENGAGE',
  'PHASE',
  'TELEPORT',
  'LOCK',
  'CORE_CHARGE',
  'IMPACT',
  'WORLD_CRASH',
  'UI_REBUILD',
  'WEBSITE',
] as const

export type CinematicPhase = (typeof CINEMATIC_PHASES)[number]

/** Camera behaviours. A shot preset selects one; the rig interprets it. */
export type CameraMode = 'ESTABLISH' | 'TRACK' | 'CHASE' | 'ORBIT' | 'FREEZE' | 'IMPACT' | 'REVEAL'

/** Entities the camera (and other systems) can reference by name. */
export type EntityId = 'velocity' | 'void' | 'origin'

export type QualityTier = 'ULTRA' | 'HIGH' | 'LITE'

export interface MotionProfile {
  /** True when the viewer asked for reduced motion (system setting or in-app toggle). */
  reduced: boolean
  /** Multiplier applied to camera shake impulses. */
  shake: number
  /** Multiplier applied to full-screen flashes and exposure dips. */
  flash: number
  /** Multiplier for ambient procedural motion (drift, glitch flicker rate). */
  ambient: number
}

export const FULL_MOTION: MotionProfile = { reduced: false, shake: 1, flash: 1, ambient: 1 }
export const REDUCED_MOTION: MotionProfile = { reduced: true, shake: 0, flash: 0.25, ambient: 0.35 }
