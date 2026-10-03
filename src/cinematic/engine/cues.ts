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
} as const

export type CueName = (typeof CUES)[keyof typeof CUES]
