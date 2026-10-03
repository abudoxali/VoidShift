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
}

/**
 * Shot vocabulary for the intro. Fighters stand on the floor; VELOCITY starts at x = -2.3,
 * VOID at x = +2.3. Shots are mostly LOCKED (lag 0 / FREEZE) or short pushes between hard cuts:
 * the camera moves when the action needs it and is still otherwise.
 *
 * Portrait variants look along the line between the fighters (their separation becomes
 * vertical) or frame a single fighter tall.
 */
export const SHOTS = {
  // ── Opening ────────────────────────────────────────────────────────────────
  OPEN_DARK: { mode: 'FREEZE', position: [0.0, 0.32, 6.4], target: [0.4, 0.55, 0], fov: 30, lag: 0, breathe: 0, portrait: { position: [0, 0.5, 7.5], fov: 50 } },
  OPEN_PUSH: { mode: 'FREEZE', position: [0.0, 0.42, 5.2], target: [0.2, 0.7, 0], fov: 32, lag: 0, breathe: 0, portrait: { position: [0, 0.6, 6.4], fov: 52 } },
  /** Low 3/4 on VELOCITY as it assembles. */
  REVEAL_VELOCITY: { mode: 'FREEZE', position: [-0.9, 0.42, 2.5], target: [-2.4, 1.15, 0], fov: 36, lag: 0, breathe: 0, portrait: { position: [-1.3, 0.55, 3.2], target: [-2.3, 1.0, 0], fov: 54 } },
  REVEAL_VELOCITY_PUSH: { mode: 'FREEZE', position: [-1.15, 0.55, 2.1], target: [-2.35, 1.3, 0], fov: 34, lag: 0, breathe: 0, portrait: { position: [-1.5, 0.65, 2.8], target: [-2.3, 1.15, 0], fov: 52 } },
  /** Low 3/4 on VOID rising out of the tear. */
  REVEAL_VOID: { mode: 'FREEZE', position: [0.9, 0.5, 2.7], target: [2.4, 1.3, 0], fov: 34, lag: 0, breathe: 0, portrait: { position: [1.2, 0.6, 3.4], target: [2.3, 1.1, 0], fov: 54 } },
  REVEAL_VOID_PUSH: { mode: 'FREEZE', position: [1.15, 0.6, 2.3], target: [2.35, 1.45, 0], fov: 32, lag: 0, breathe: 0, portrait: { position: [1.4, 0.7, 3.0], target: [2.3, 1.2, 0], fov: 52 } },
  /** Establishing wide: both silhouettes, structures behind. */
  WIDE: { mode: 'FREEZE', position: [0, 1.1, 6.6], target: [0, 1.0, 0], fov: 36, lag: 0, breathe: 0, portrait: { position: [-7.6, 3.4, 5.2], target: [0.6, 0.9, -0.3], fov: 52 } },
  WIDE_PUSH: { mode: 'FREEZE', position: [0, 1.0, 5.7], target: [0, 1.05, 0], fov: 35, lag: 0, breathe: 0, portrait: { position: [-6.8, 3.1, 4.6], target: [0.6, 0.95, -0.3], fov: 50 } },

  // ── First exchange ─────────────────────────────────────────────────────────
  /** Low behind VELOCITY's shoulder: the crouch in the foreground, VOID ahead. */
  LOW_PREP: { mode: 'FREEZE', position: [-4.1, 0.38, 1.6], target: [0.6, 1.05, -0.2], fov: 38, lag: 0, breathe: 0, portrait: { position: [-4.6, 0.6, 1.0], target: [1.0, 1.0, -0.2], fov: 54 } },
  /** Side tracking: rides alongside the dash. */
  SIDE_TRACK: {
    mode: 'CHASE',
    position: [-0.4, 0.35, 3.6],
    target: [0, 1.0, 0],
    fov: 44,
    track: 'velocity',
    trackWeight: 1,
    lead: 1.1,
    lag: 14,
    breathe: 0,
    portrait: { position: [-0.8, 0.6, 4.6], fov: 58 },
  },
  /** Close on VOID as the strike passes through it. */
  PHASE_CLOSE: { mode: 'FREEZE', position: [2.0, 1.25, 2.3], target: [2.3, 1.25, 0], fov: 34, lag: 0, breathe: 0, portrait: { position: [2.2, 1.3, 3.0], fov: 52 } },
  /** 3/4 wide: both fighters readable after the pass. */
  THREE_Q: { mode: 'FREEZE', position: [3.4, 1.35, 6.4], target: [3.7, 0.95, 0], fov: 38, lag: 0, breathe: 0, portrait: { position: [8.8, 2.8, 4.0], target: [3.6, 0.9, 0], fov: 54 } },

  // ── Close combat ───────────────────────────────────────────────────────────
  CLOSE_COMBAT: { mode: 'FREEZE', position: [4.5, 1.15, 3.5], target: [3.0, 1.15, 0], fov: 36, lag: 0, breathe: 0, portrait: { position: [5.6, 1.4, 4.2], target: [3.2, 1.1, 0], fov: 54 } },
  /** Low, looking up as VELOCITY vaults over VOID. */
  OVER_LOW: { mode: 'FREEZE', position: [2.2, 0.3, 3.0], target: [2.0, 1.9, 0], fov: 46, lag: 0, breathe: 0, portrait: { position: [2.2, 0.35, 3.8], target: [2.0, 1.7, 0], fov: 60 } },
  THREE_Q_LEFT: { mode: 'FREEZE', position: [-0.4, 1.3, 5.6], target: [1.6, 1.0, 0], fov: 38, lag: 0, breathe: 0, portrait: { position: [-4.8, 2.6, 3.6], target: [1.6, 0.9, 0], fov: 54 } },

  // ── Teleport / deception ───────────────────────────────────────────────────
  THROW_LOW: { mode: 'FREEZE', position: [-1.1, 0.7, 1.9], target: [3.0, 1.3, -0.4], fov: 38, lag: 0, breathe: 0, portrait: { position: [-1.6, 0.9, 2.2], target: [3.0, 1.2, -0.4], fov: 54 } },
  /** Insert: the planted anchor. */
  MARKER_INSERT: { mode: 'FREEZE', position: [5.9, 0.55, 0.75], target: [4.95, 0.35, -0.45], fov: 30, lag: 0, breathe: 0, portrait: { position: [6.0, 0.7, 1.2], fov: 46 } },
  MARKER_PUSH: { mode: 'FREEZE', position: [5.55, 0.48, 0.3], target: [4.95, 0.38, -0.45], fov: 28, lag: 0, breathe: 0, portrait: { position: [5.7, 0.6, 0.8], fov: 44 } },
  SIDE_TRACK_B: {
    mode: 'CHASE',
    position: [-0.2, 0.4, 3.4],
    target: [0, 1.0, 0],
    fov: 46,
    track: 'velocity',
    trackWeight: 1,
    lead: 1.0,
    lag: 14,
    breathe: 0,
    portrait: { position: [-0.5, 0.7, 4.4], fov: 58 },
  },
  /** Overhead: the deception becomes legible — VOID phased, the strike gone, the anchor behind it. */
  OVERHEAD: { mode: 'FREEZE', position: [2.6, 8.4, 2.2], target: [3.0, 0.2, -0.3], fov: 44, lag: 0, breathe: 0, portrait: { position: [2.9, 9.6, 1.6], target: [3.1, 0.2, -0.3], fov: 56 } },
  /** Past VOID's shoulder toward the reconstructed VELOCITY. */
  BEHIND_VOID: { mode: 'FREEZE', position: [0.6, 1.6, 2.6], target: [4.4, 1.4, -0.4], fov: 40, lag: 0, breathe: 0, portrait: { position: [0.2, 1.9, 2.8], target: [4.2, 1.5, -0.4], fov: 56 } },

  // ── Code Core ──────────────────────────────────────────────────────────────
  /** Low, looking up at the inverted VELOCITY above VOID. */
  HERO_LOW: { mode: 'FREEZE', position: [3.25, 0.85, 3.1], target: [2.6, 2.35, 0], fov: 50, lag: 0, breathe: 0, portrait: { position: [3.6, 0.5, 5.6], target: [2.65, 2.2, 0], fov: 58 } },
  HERO_LOW_PUSH: { mode: 'FREEZE', position: [3.15, 0.95, 2.75], target: [2.6, 2.4, 0], fov: 50, lag: 0, breathe: 0, portrait: { position: [3.45, 0.6, 5.0], target: [2.65, 2.25, 0], fov: 56 } },
  CORE_CLOSE: { mode: 'FREEZE', position: [3.75, 1.85, 1.75], target: [2.8, 2.1, -0.2], fov: 36, lag: 0, breathe: 0, portrait: { position: [3.85, 1.9, 2.4], fov: 50 } },
  VOID_FACE: { mode: 'FREEZE', position: [1.15, 1.15, 1.75], target: [2.5, 2.05, -0.1], fov: 42, lag: 0, breathe: 0, portrait: { position: [1.2, 1.2, 2.3], fov: 52 } },

  // ── Impact ─────────────────────────────────────────────────────────────────
  IMPACT_HERO: { mode: 'IMPACT', position: [4.7, 1.0, 3.3], target: [2.7, 1.35, 0], fov: 40, lag: 0, breathe: 0, portrait: { position: [4.6, 1.1, 4.2], target: [2.7, 1.3, 0], fov: 58 } },
  IMPACT_WIDE: { mode: 'IMPACT', position: [1.4, 1.6, 9.4], target: [2.6, 1.1, 0], fov: 42, lag: 0, breathe: 0, portrait: { position: [-4.2, 4.0, 7.4], target: [2.6, 1.0, 0], fov: 58 } },
  AFTERMATH: { mode: 'FREEZE', position: [0.6, 1.9, 10.2], target: [2.8, 0.75, 0], fov: 38, lag: 0, breathe: 0, portrait: { position: [-4.6, 4.2, 8.0], target: [2.8, 0.6, 0], fov: 54 } },
  AFTERMATH_PUSH: { mode: 'FREEZE', position: [1.2, 1.55, 8.4], target: [2.9, 0.75, 0], fov: 36, lag: 0, breathe: 0, portrait: { position: [-3.6, 3.6, 7.0], target: [2.9, 0.6, 0], fov: 52 } },
} as const satisfies Record<string, ShotPreset>

export type ShotName = keyof typeof SHOTS
