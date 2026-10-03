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
  /** Rig damping rate (1/s). Lower = heavier, more cinematic lag. 0 = locked. */
  readonly lag: number
  readonly breathe: number
  /** 0..1 fit-width adaptation (default 1). Portrait-authored variants use 0. */
  readonly fit?: number
  /** CHASE look-ahead along the tracked entity's motion (world units). */
  readonly lead?: number
  /** Portrait composition: overrides applied when the timeline is compiled for portrait. */
  readonly portrait?: Partial<Omit<ShotPreset, 'portrait'>>
  /**
   * Framing contract, checked by the framing tests: which fighters must be fully in frame
   * (head, hands, feet) while this shot is live. Close-ups and inserts declare none.
   */
  readonly fullBody?: ReadonlyArray<'velocity' | 'void'>
}

const still = (position: Vec3Tuple, target: Vec3Tuple, fov: number, extra: Partial<ShotPreset> = {}): ShotPreset => ({ mode: 'FREEZE', position, target, fov, lag: 0, breathe: 0, ...extra })

/**
 * Shot vocabulary for the fight. Stage: AERON (engine `velocity`) starts at x = -2.0 facing +X,
 * NOX (`void`) stands at x = +1.6 facing -X; they fight around x ≈ 0.5–1.6. Every shot names its
 * primary subject, secondary subject and reason. Shots are locked; the edit is done with cuts.
 * Portrait uses the rig's fit-width adaptation unless a shot declares its own composition.
 */
export const SHOTS = {
  // 01 ARRIVAL — subject: both fighters (NOX silhouette, AERON reconstructing). Low wide: two
  // fighters, one space, immediately.
  ARRIVAL_WIDE: still([-0.25, 0.42, 5.6], [-0.2, 1.0, 0], 42, { fullBody: ['velocity', 'void'] }),

  // 02 STANDOFF — inserts. AERON's eyes; NOX's eyes; AERON sinking into his stance.
  AERON_EYES: still([-1.38, 1.6, 0.2], [-1.95, 1.58, 0], 24),
  NOX_EYES: still([0.88, 1.68, -0.2], [1.6, 1.64, 0], 28),
  AERON_STANCE_LOW: still([-0.53, 0.5, 2.68], [-1.85, 0.78, 0], 42, { fullBody: ['velocity'] }),

  // 03 FIRST ATTACK — profile two-shot: the whole dash and punch in one readable frame…
  ATTACK_PROFILE: still([-0.4, 1.0, 4.5], [-0.25, 0.92, 0], 40, { fullBody: ['velocity', 'void'] }),
  // …then the penetration: 3/4 side, both upper bodies, the fist inside NOX's chest.
  PENETRATION: still([0.95, 1.38, 1.5], [1.38, 1.24, 0], 34),
  // NOX's counter elbow and AERON's duck: full bodies, side on.
  COUNTER_TWO: still([1.0, 0.86, 3.5], [1.0, 0.82, 0], 40, { fullBody: ['velocity', 'void'] }),

  // 04 CLOSE COMBAT — medium two-shot; over NOX's shoulder for the grab; low 3/4 for the kick.
  CLOSE_TWO: still([0.83, 0.82, 3.75], [0.95, 0.73, 0], 40, { fullBody: ['velocity', 'void'] }),
  GRAB_OTS: still([2.55, 1.55, 1.05], [0.55, 1.0, -0.2], 40),
  SPIN_LOW: still([0.05, 0.42, 3.2], [0.95, 0.8, -0.1], 44, { fullBody: ['velocity', 'void'] }),

  // 05 FAILED STRATEGY — AERON backs off; close on his eyes: he is thinking.
  RESET_TWO: still([0.4, 0.95, 3.75], [0.6, 0.88, 0], 40, { fullBody: ['velocity', 'void'] }),
  AERON_THINK: still([0.42, 1.6, 0.62], [-0.2, 1.56, -0.05], 26),

  // 06 ANCHOR — insert on the hand forming the anchor; the throw side-on; NOX's eyes following
  // it; the anchor planted behind him.
  ANCHOR_HAND: still([0.95, 1.5, 0.95], [0.25, 1.3, -0.08], 32),
  THROW_SIDE: still([-0.6, 0.98, 3.45], [0.7, 0.8, -0.1], 44, { fullBody: ['velocity', 'void'] }),
  NOX_WATCH: still([0.85, 1.62, 0.95], [1.65, 1.6, -0.05], 32),
  ANCHOR_PLANT: still([3.65, 0.5, 0.65], [2.95, 0.32, -0.45], 34),

  // 07 SECOND ATTACK — from NOX's front-left: AERON comes at NOX, the anchor is visible behind.
  SECOND_ATTACK: still([-0.2, 1.05, 3.0], [1.6, 0.84, -0.25], 42, { fullBody: ['void'] }),

  // 08 TELEPORT — the empty frame (NOX alone, the beacon behind him), then a hard cut: NOX in
  // the foreground, AERON reconstructing above / behind at the anchor.
  TELEPORT_EMPTY: still([-0.6, 1.25, 3.6], [1.9, 1.0, -0.3], 40, { fullBody: ['void'] }),
  RECONSTRUCT: still([0.55, 0.75, 1.75], [2.4, 1.65, -0.35], 44),

  // 09 REVERSAL — on NOX's face as it turns (head → shoulders → torso); AERON above / behind.
  NOX_TURN: still([0.75, 1.62, 0.85], [1.7, 1.7, 0], 36),
  REVERSAL_WIDE: still([-0.1, 0.8, 4.1], [1.95, 1.45, -0.1], 48, { fullBody: ['void', 'velocity'] }),

  // 10 CODE CORE — tight hero 3/4: AERON's face, hand and core; NOX lit below.
  CORE_HERO: still([1.45, 2.2, 1.55], [2.2, 2.0, -0.05], 36),
  CORE_LOW: still([1.1, 0.9, 2.2], [2.0, 1.75, -0.05], 44),

  // 11 STRIKE — profile, both full bodies: the drive is read as body mechanics.
  STRIKE_PROFILE: still([1.95, 1.5, 5.3], [1.95, 1.45, 0], 42, { fullBody: ['velocity', 'void'] }),

  // 12 IMPACT — the contact (both readable), then wide for the expansion.
  IMPACT_HERO: { mode: 'IMPACT', position: [1.0, 1.15, 2.6], target: [1.85, 1.2, 0], fov: 42, lag: 0, breathe: 0 },
  IMPACT_WIDE: { mode: 'IMPACT', position: [0.3, 1.5, 6.6], target: [1.9, 0.9, 0], fov: 42, lag: 0, breathe: 0 },

  // 13 AFTERMATH — wide: crater, floating fragments, NOX down, AERON landed.
  AFTERMATH: still([-0.6, 1.5, 6.8], [1.9, 0.6, 0], 40, { fullBody: ['velocity', 'void'] }),
  AFTERMATH_PUSH: still([-0.1, 1.35, 6.0], [2.0, 0.6, 0], 38, { fullBody: ['velocity', 'void'] }),
} as const satisfies Record<string, ShotPreset>

export type ShotName = keyof typeof SHOTS
