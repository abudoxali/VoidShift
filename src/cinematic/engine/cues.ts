/**
 * Cue vocabulary. Cues are instantaneous events placed on the master timeline; systems
 * (camera rig, grid ripples, audio, UI) subscribe to them instead of keeping their own timers.
 */
export const CUES = {
  CAMERA_CUT: 'camera:cut',
  /** data: { amount } */
  CAMERA_SHAKE: 'camera:shake',
  /** data: { x, z, strength } — a shockwave travelling through the world grid. */
  GRID_RIPPLE: 'grid:ripple',
  BOOT_PULSE: 'boot:pulse',
  VELOCITY_TARGET: 'velocity:target',
  VELOCITY_DASH: 'velocity:dash',
  VELOCITY_ARRIVE: 'velocity:arrive',
  VOID_STIR: 'void:stir',
  VOID_OPEN: 'void:open',
  /** VELOCITY acquires the VOID: rings align into a sight, trajectory is computed. */
  VELOCITY_LOCK: 'velocity:lock',
  /** Explosive acceleration out of the wind-up. */
  VELOCITY_LAUNCH: 'velocity:launch',
  /** The expected contact: VOID leaves solid space instead (data: { exchange }). */
  VOID_PHASE: 'void:phase',
  /** VELOCITY emerges on the far side of the core (data: { exchange }). */
  VELOCITY_PASSTHROUGH: 'velocity:passthrough',
  /** VELOCITY decelerates, turns and re-evaluates. */
  VELOCITY_RECOVER: 'velocity:recover',
  /** Space parts along the attack line ahead of the second vector. */
  VOID_SPLIT: 'void:split',
} as const

export type CueName = (typeof CUES)[keyof typeof CUES]
