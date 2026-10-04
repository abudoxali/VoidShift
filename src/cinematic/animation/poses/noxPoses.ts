import { armL, armR, compilePose, legR, type PoseSpec } from '../pose'

/**
 * NOX's pose library: a heavy, planted fighter. Wide stance, minimal movement, forearms as
 * shields. His reactions are layered (head → shoulders → torso) to sell the moment he is beaten.
 */
const A = 0.05
const fists = { L: 'fist', R: 'fist' } as const
const wideFeet = { L: [0.16, A, 0.16], R: [-0.17, A, -0.18] } as PoseSpec['feet']
const guardArms = { ...armL(72, 24, 112, 8), ...armR(60, 22, 118, -6) }

const spec = {
  /** Standing in the dark: still, heavy, arms loose. */
  stand: {
    hips: { y: -0.02 },
    feet: { L: [0.13, A, 0.04], R: [-0.13, A, -0.04] },
    joints: { chest: [-2, 0, 0], neck: [4, 0, 0], head: [6, 0, 0], ...armL(8, 12, 16), ...armR(8, 12, 16) },
  },
  /** Guard up: forearms raised as shields. */
  guard: {
    hips: { y: -0.08, rot: [0, -16, 0] },
    feet: wideFeet,
    hands: fists,
    joints: { spine: [6, 6, 0], chest: [8, 6, 0], neck: [0, 6, 0], head: [6, 4, 0], ...guardArms },
  },
  /** Minimal dodge: the upper body sways off the line as the phase begins. */
  phaseLean: {
    hips: { y: -0.1, x: -0.05, rot: [0, -20, 6] },
    feet: wideFeet,
    hands: fists,
    joints: { spine: [-4, 4, 10], chest: [-6, 4, 12], neck: [0, 0, -4], head: [4, 10, -6], ...armL(54, 34, 96), ...armR(40, 30, 104) },
  },
  /** Confident: phased, chin up, letting it pass. */
  confident: {
    hips: { y: -0.04, rot: [0, -8, 0] },
    feet: { L: [0.14, A, 0.08], R: [-0.14, A, -0.1] },
    hands: { L: 'open', R: 'open' },
    joints: { chest: [-6, 0, 0], neck: [-4, 0, 0], head: [-6, 0, 0], ...armL(16, 22, 26), ...armR(16, 22, 26) },
  },
  /** Elbow load: right elbow drawn back, torso coiled. */
  elbowWind: {
    hips: { y: -0.1, rot: [0, -38, 0] },
    feet: wideFeet,
    hands: fists,
    joints: { spine: [4, -14, 0], chest: [6, -20, 0], neck: [0, 22, 0], head: [2, 20, 0], ...armL(70, 26, 108), ...armR(80, 72, 150, 0) },
  },
  /** Horizontal elbow: hips and shoulders whip through. */
  elbow: {
    hips: { y: -0.11, z: 0.06, rot: [0, 30, 0] },
    feet: { L: [0.17, A, 0.24], R: [-0.15, A + 0.04, -0.12] },
    hands: fists,
    joints: { spine: [8, 20, 0], chest: [10, 28, 0], neck: [0, -20, 0], head: [2, -18, 0], footR: [28, 0, 0], ...armL(62, 30, 112), ...armR(92, 84, 152, 0) },
  },
  /** Block: forearms stacked across the body line. */
  block: {
    hips: { y: -0.13, z: -0.04, rot: [0, -10, 0] },
    feet: wideFeet,
    hands: fists,
    joints: { spine: [12, 0, 0], chest: [14, 0, 0], neck: [6, 0, 0], head: [10, 0, 0], ...armL(86, -10, 118, 20), ...armR(78, -6, 112, -20) },
  },
  /** Low block: elbows tucked over the ribs, absorbing a body kick. */
  blockLow: {
    hips: { y: -0.12, z: -0.03, rot: [0, -6, 0] },
    feet: wideFeet,
    hands: fists,
    joints: { spine: [12, -8, 0], chest: [16, -10, 0], neck: [4, 6, 0], head: [6, 6, 0], ...armL(16, 12, 98, 34), ...armR(12, 14, 102, -34) },
  },
  /** Grab: a lunge with both hands. */
  grab: {
    hips: { y: -0.14, z: 0.18, rot: [0, 0, 0] },
    feet: { L: [0.16, A, 0.44], R: [-0.16, A + 0.05, -0.12] },
    hands: { L: 'open', R: 'open' },
    joints: { spine: [18, 0, 0], chest: [18, 0, 0], neck: [-10, 0, 0], head: [-10, 0, 0], footR: [30, 0, 0], ...armL(90, 4, 22, 10), ...armR(90, 4, 22, -10) },
  },
  /** Grab misses: over-reached, hands closing on nothing. */
  grabMiss: {
    hips: { y: -0.17, z: 0.24, rot: [0, -12, 0] },
    feet: { L: [0.16, A, 0.48], R: [-0.16, A + 0.06, -0.08] },
    hands: fists,
    joints: { spine: [26, -8, 0], chest: [24, -10, 0], neck: [-10, 10, 0], head: [-6, 14, 0], footR: [38, 0, 0], ...armL(70, 26, 40), ...armR(80, 22, 30) },
  },
  /** Watches the anchor fly past: eyes and head follow it over his left shoulder. */
  watch: {
    hips: { y: -0.08, rot: [0, -16, 0] },
    feet: wideFeet,
    hands: fists,
    joints: { spine: [4, 6, 0], chest: [6, 10, 0], neck: [-6, 34, 0], head: [-10, 40, 4], ...guardArms },
  },
  /** Reversal, beat 1: the head turns. */
  turnHead: {
    hips: { y: -0.08, rot: [0, -16, 0] },
    feet: wideFeet,
    hands: fists,
    joints: { spine: [4, 6, 0], chest: [6, 6, 0], neck: [-14, -38, 0], head: [-16, -44, 0], ...guardArms },
  },
  /** Reversal, beat 2: the shoulders follow. */
  turnShoulders: {
    hips: { y: -0.09, rot: [0, -24, 0] },
    feet: wideFeet,
    hands: fists,
    joints: { spine: [0, -24, 0], chest: [-4, -34, 0], neck: [-18, -30, 0], head: [-20, -30, 0], ...armL(90, 30, 90), ...armR(52, 26, 120) },
  },
  /** Reversal, beat 3: the torso turns and a guard comes up — too late. */
  turnGuard: {
    hips: { y: -0.1, rot: [0, -40, 0] },
    feet: wideFeet,
    hands: { L: 'open', R: 'fist' },
    joints: { spine: [-6, -30, 0], chest: [-12, -34, 0], neck: [-22, -26, 0], head: [-24, -20, 0], ...armL(150, 36, 40), ...armR(70, 30, 110) },
  },
  /** Hit: driven down and back. */
  recoil: {
    hips: { y: -0.22, z: -0.12, rot: [-8, -30, 0] },
    feet: { L: [0.2, A, 0.2], R: [-0.18, A, -0.3] },
    hands: { L: 'open', R: 'open' },
    joints: { spine: [-16, -20, 0], chest: [-24, -20, 8], neck: [-18, 0, 0], head: [-22, 6, 0], ...armL(60, 74, 20), ...armR(40, 70, 26) },
  },
  /** Down: one knee, head low, a hand on the floor. */
  collapse: {
    hips: { y: -0.5, rot: [0, -20, 0] },
    feet: { L: [0.18, A, 0.26], R: [-0.16, 0.1, -0.36] },
    hands: { L: 'open', R: 'open' },
    joints: { spine: [24, 0, 0], chest: [28, 0, 0], neck: [18, 0, 0], head: [24, 0, 0], footR: [66, 0, 0], ...armL(36, 18, 30), ...armR(54, 14, 14) },
  },
  /** Heavy kick, a front push kick (used rarely: NOX's legs are his anchor). */
  pushKick: {
    hips: { y: -0.02, rot: [-6, -10, 0] },
    feet: { L: [0.12, A, -0.04] },
    hands: fists,
    joints: { spine: [-10, 0, 0], chest: [-8, 0, 0], head: [8, 0, 0], ...legR(82, 4, 20, -20), ...guardArms },
  },
} satisfies Record<string, PoseSpec>

export type NoxPose = keyof typeof spec
export const NOX_POSE_SPECS: Readonly<Record<NoxPose, PoseSpec>> = spec
export const NOX_POSES = Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, compilePose(v)])) as Record<NoxPose, ReturnType<typeof compilePose>>
