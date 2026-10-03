/**
 * Cue vocabulary. Cues are instantaneous events placed on the master timeline; systems
 * (camera rig, grid ripples, particle bursts, debris, audio) subscribe to them instead of
 * keeping their own timers.
 */
export const CUES = {
  CAMERA_CUT: 'camera:cut',
  /** data: { amount } */
  CAMERA_SHAKE: 'camera:shake',
  /** data: { x, z, strength } — a shockwave travelling through the floor. */
  GRID_RIPPLE: 'grid:ripple',
  /** data: { x, y, z, kind, scale } — a GPU particle burst (see effects/particles/Bursts). */
  BURST: 'fx:burst',
  BOOT_PULSE: 'boot:pulse',
  VELOCITY_ASSEMBLE: 'velocity:assemble',
  VOID_OPEN: 'void:open',
  VELOCITY_DASH: 'velocity:dash',
  VOID_PHASE: 'void:phase',
  VELOCITY_SKID: 'velocity:skid',
  CLASH: 'fight:clash',
  VOID_COUNTER: 'void:counter',
  LAND: 'fight:land',
  VOID_GRAB: 'void:grab',
  ANCHOR_FORM: 'anchor:form',
  ANCHOR_THROW: 'anchor:throw',
  ANCHOR_PLANT: 'anchor:plant',
  TELEPORT_OUT: 'teleport:out',
  TELEPORT_IN: 'teleport:in',
  VOID_REALIZE: 'void:realize',
  CORE_FORM: 'core:form',
  VOID_PHASE_FAIL: 'void:phaseFail',
  /** data: { x, y, z } — the hero contact. */
  IMPACT: 'impact:contact',
  /** data: { x, y, z } — debris + explosion expansion begins. */
  EXPLOSION: 'impact:explosion',
  /** The world settles: ringing silence, debris coming to rest. */
  AFTERMATH: 'impact:aftermath',
} as const

export type CueName = (typeof CUES)[keyof typeof CUES]

/** Burst kinds understood by the burst particle system. */
export const BURST = {
  /** Teleport out: glyph/particle implosion. */
  IMPLODE: 0,
  /** Reconstruction: particles converge into a body. */
  ASSEMBLE: 1,
  /** Contact sparks. */
  SPARKS: 2,
  /** Floor dust kicked up. */
  DUST: 3,
  /** VOID's dark wave. */
  VOID: 4,
} as const
