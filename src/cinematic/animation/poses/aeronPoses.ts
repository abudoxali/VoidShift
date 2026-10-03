import { armL, armR, compilePose, legL, legR, type PoseSpec } from '../pose'

/**
 * AERON's pose library. Orthodox stance: left foot and left shoulder lead, the hips turned ~22°
 * to the right, the right hand guarding the chin. Grounded poses plant their feet with IK
 * (ankle targets in character space); airborne poses are pure FK.
 *
 * Strikes are authored as mechanics, not destinations: a coil pose (load), a release pose
 * (hips → shoulder → arm), an over-extension or follow-through pose, then the guard returns.
 */
const A = 0.045 // planted ankle height
const fists = { L: 'fist', R: 'fist' } as const

const stanceFeet = { L: [0.11, A, 0.2], R: [-0.13, A + 0.02, -0.22] } as PoseSpec['feet']
const guardArms = { ...armL(62, 12, 98, 10), ...armR(42, 16, 128, -6) }

const spec = {
  /** Reconstruction kneel: one knee down, head bowed. */
  assemble: {
    hips: { y: -0.44, z: 0.02, rot: [0, -10, 0] },
    feet: { L: [0.12, A, 0.26], R: [-0.12, 0.1, -0.34] },
    joints: { spine: [8, 0, 0], chest: [14, 0, 0], neck: [8, 0, 0], head: [12, 0, 0], footR: [62, 0, 0], ...armL(22, 18, 30), ...armR(30, 22, 38) },
  },
  /** Calm upright stance. */
  stand: {
    hips: { y: -0.012 },
    feet: { L: [0.1, A, 0.04], R: [-0.1, A, -0.03] },
    joints: { chest: [-2, 0, 0], head: [2, 0, 0], ...armL(6, 9, 14), ...armR(6, 9, 14) },
  },
  /** Fighting stance. */
  guard: {
    hips: { y: -0.075, rot: [0, -22, 0] },
    feet: stanceFeet,
    hands: fists,
    joints: { spine: [4, 8, 0], chest: [6, 8, 0], neck: [2, 4, 0], head: [6, 2, 0], footR: [22, 0, 0], ...guardArms },
  },
  /** Centre of gravity lowered: the decision to attack. */
  lowGuard: {
    hips: { y: -0.17, rot: [0, -24, 0] },
    feet: { L: [0.15, A, 0.28], R: [-0.16, A + 0.03, -0.3] },
    hands: fists,
    joints: { spine: [12, 8, 0], chest: [10, 8, 0], neck: [-4, 4, 0], head: [-6, 2, 0], footR: [32, 0, 0], ...armL(66, 14, 96, 10), ...armR(46, 18, 126, -6) },
  },
  /** Lead step: the left foot travels, the body leans into it (anticipation of the cross). */
  stepLead: {
    hips: { y: -0.12, z: 0.1, rot: [0, -28, 0] },
    feet: { L: [0.1, A, 0.48], R: [-0.14, A + 0.05, -0.16] },
    hands: fists,
    joints: { spine: [12, 0, 0], chest: [12, -10, 0], neck: [-4, 6, 0], head: [-6, 4, 0], footR: [40, 0, 0], ...armL(70, 10, 80, 10), ...armR(34, 24, 135, -10) },
  },
  /** Right straight: hips turn, shoulder drives, arm extends, the lead hand guards the face. */
  cross: {
    hips: { y: -0.11, z: 0.2, rot: [0, 0, 0] },
    feet: { L: [0.1, A, 0.5], R: [-0.12, A + 0.07, -0.06] },
    hands: fists,
    joints: { spine: [4, 6, 0], chest: [2, 8, 0], neck: [-2, -10, 0], head: [0, -6, 0], footR: [50, 0, 0], ...armL(52, 18, 128, 6), ...armR(92, 6, 4, -20) },
  },
  /** Over-extension: the fist met nothing; the body follows past balance. */
  overextend: {
    hips: { y: -0.15, z: 0.3, rot: [0, 8, 0] },
    feet: { L: [0.1, A, 0.56], R: [-0.11, A + 0.1, 0.02] },
    hands: fists,
    joints: { spine: [8, 8, 0], chest: [8, 10, 0], neck: [-6, -12, 0], head: [-4, -10, 0], footR: [60, 0, 0], ...armL(30, 30, 110, 6), ...armR(96, 4, 0, -24) },
  },
  /** Duck under a horizontal strike. */
  duck: {
    hips: { y: -0.36, z: -0.04, rot: [0, -20, 0] },
    feet: { L: [0.16, A, 0.24], R: [-0.16, A + 0.03, -0.24] },
    hands: fists,
    joints: { spine: [24, 6, 0], chest: [20, 6, 0], neck: [-14, 0, 0], head: [-18, 0, 0], footR: [36, 0, 0], ...armL(74, 8, 118, 10), ...armR(60, 12, 130, -8) },
  },
  /** Rear roundhouse to the body: standing leg pivots, hips open, the right shin swings through. */
  bodyKick: {
    hips: { y: -0.06, rot: [0, 62, -12] },
    feet: { L: [0.08, A + 0.02, 0.14] },
    hands: fists,
    joints: { spine: [0, -20, 14], chest: [4, -26, 10], neck: [0, -16, 0], head: [2, -12, 0], footL: [26, 0, 0], ...legR(78, 62, 22, 30), ...armL(64, 26, 110), ...armR(-36, 34, 22) },
  },
  /** Turning out of a grab: a fast pivot, arms tucked. */
  rotateOut: {
    hips: { y: -0.14, rot: [0, 150, 0] },
    feet: { L: [0.06, A + 0.02, 0.08] },
    hands: fists,
    joints: { spine: [10, 20, 0], chest: [10, 20, 0], head: [0, -30, 0], footL: [30, 0, 0], ...legR(30, 18, 60, 20), ...armL(70, 20, 125), ...armR(70, 20, 125) },
  },
  /** Spinning hook kick, the left leg extended high. */
  spinKick: {
    hips: { y: -0.02, rot: [0, 0, 30] },
    feet: { R: [-0.06, A + 0.02, 0.0] },
    hands: fists,
    joints: { spine: [0, 0, -24], chest: [-4, 0, -26], neck: [0, 10, 16], head: [4, 10, 12], footR: [26, 0, 0], ...legL(68, 96, 4, 20), ...armL(18, 68, 30), ...armR(40, 40, 110) },
  },
  /** Retreat: weight back, guard up. */
  backstep: {
    hips: { y: -0.09, z: -0.08, rot: [0, -22, 0] },
    feet: { L: [0.11, A, 0.08], R: [-0.13, A + 0.02, -0.36] },
    hands: fists,
    joints: { spine: [-2, 8, 0], chest: [0, 8, 0], head: [4, 2, 0], footR: [18, 0, 0], ...guardArms },
  },
  /** The realisation: guard drops a little, the weight settles, the eyes work. */
  think: {
    hips: { y: -0.06, rot: [0, -18, 0] },
    feet: { L: [0.11, A, 0.16], R: [-0.13, A, -0.2] },
    hands: { L: 'open', R: 'fist' },
    joints: { spine: [2, 6, 0], chest: [4, 6, 0], neck: [6, 0, 0], head: [10, -4, -3], footR: [8, 0, 0], ...armL(26, 16, 42), ...armR(46, 14, 132, -6) },
  },
  /** The anchor forms in the right hand, held at chest height, palm up. */
  anchorForm: {
    hips: { y: -0.08, rot: [0, -20, 0] },
    feet: stanceFeet,
    hands: { L: 'fist', R: 'blade' },
    joints: { spine: [4, 4, 0], chest: [6, -6, 0], neck: [10, -6, 0], head: [16, -8, 0], footR: [22, 0, 0], ...armL(60, 12, 100, 10), ...armR(52, 22, 96, 60) },
  },
  /** Throw wind-up: arm high and back, hips and shoulders coiled, the lead hand aims. */
  throwWind: {
    hips: { y: -0.12, rot: [0, -40, 0] },
    feet: { L: [0.13, A, 0.34], R: [-0.15, A + 0.02, -0.26] },
    hands: { L: 'open', R: 'blade' },
    joints: { spine: [-4, -10, 0], chest: [-8, -24, 0], neck: [0, 22, 0], head: [2, 18, 0], footR: [20, 0, 0], ...armL(84, 6, 12, 0), ...armR(150, 28, 112, 0) },
  },
  /** Release + follow-through: hips → shoulder → elbow → wrist. */
  throwRelease: {
    hips: { y: -0.13, z: 0.12, rot: [0, 30, 0] },
    feet: { L: [0.12, A, 0.42], R: [-0.12, A + 0.09, -0.04] },
    hands: { L: 'fist', R: 'open' },
    joints: { spine: [14, 16, 0], chest: [16, 24, 0], neck: [-10, -16, 0], head: [-8, -14, 0], footR: [55, 0, 0], ...armL(20, 30, 90), ...armR(62, 4, 6, -10) },
  },
  /** Explosive forward dash. */
  dash: {
    hips: { y: -0.16, z: 0.12, rot: [0, -6, 0] },
    feet: { L: [0.1, A, 0.42] },
    hands: { L: 'open', R: 'fist' },
    joints: { spine: [22, 0, 0], chest: [18, 0, 0], neck: [-16, 0, 0], head: [-14, 0, 0], ...legR(-38, 6, 74, 30), ...armL(-34, 22, 24), ...armR(30, 22, 118) },
  },
  /** Teleport out: the body opens as it comes apart. */
  fragment: {
    hips: { y: -0.05, z: 0.1 },
    hands: { L: 'open', R: 'open' },
    joints: { spine: [-6, 0, 0], chest: [-10, 0, 0], head: [-10, 0, 0], ...legL(22, 10, 30, 10), ...legR(-16, 10, 24, 10), ...armL(40, 62, 20), ...armR(40, 62, 20) },
  },
  /** Reconstructed in the air above / behind: tucked, coiled. */
  airTuck: {
    hips: { y: 0 },
    hands: { L: 'open', R: 'fist' },
    joints: { spine: [24, 0, 0], chest: [20, 0, 0], neck: [-6, 0, 0], head: [-8, 0, 0], ...legL(88, 12, 112, 20), ...legR(70, 12, 116, 20), ...armL(58, 26, 40), ...armR(-24, 38, 96) },
  },
  /** The Code Core held out over NOX: right arm forward, palm open; left arm back for balance. */
  coreHold: {
    hips: { y: 0, rot: [0, 10, 0] },
    hands: { L: 'open', R: 'open' },
    joints: { spine: [16, 8, 0], chest: [16, 12, 0], neck: [-4, -6, 0], head: [2, -8, 0], ...legL(70, 14, 96, 20), ...legR(48, 10, 104, 20), ...armL(-24, 52, 30), ...armR(72, 14, 34, -40) },
  },
  /** Anticipation of the drive: the striking arm drawn back, torso coiled away. */
  coreCock: {
    hips: { y: 0, rot: [0, -16, 0] },
    hands: { L: 'open', R: 'open' },
    joints: { spine: [10, -14, 0], chest: [6, -22, 0], neck: [4, 12, 0], head: [8, 10, 0], ...legL(80, 14, 104, 20), ...legR(60, 10, 110, 20), ...armL(40, 30, 40), ...armR(-30, 44, 104, -20) },
  },
  /** The drive: shoulder → torso → arm → core, the whole body behind the hand. */
  coreDrive: {
    hips: { y: 0, rot: [0, 28, 0] },
    hands: { L: 'open', R: 'open' },
    joints: { spine: [30, 18, 0], chest: [30, 24, 0], neck: [-14, -16, 0], head: [-10, -14, 0], ...legL(30, 10, 60, 20), ...legR(-10, 10, 50, 20), ...armL(-50, 46, 20), ...armR(118, 6, 4, -30) },
  },
  /** Hero landing: knee down, one hand on the floor. */
  heroLand: {
    hips: { y: -0.47, rot: [0, -12, 0] },
    feet: { L: [0.15, A, 0.22], R: [-0.13, 0.11, -0.34] },
    hands: { L: 'open', R: 'open' },
    joints: { spine: [18, 0, 0], chest: [20, -4, 0], neck: [-8, 0, 0], head: [-10, 0, 0], footR: [64, 0, 0], ...armL(-28, 52, 18), ...armR(46, 26, 12, 0) },
  },
  /** Rising out of the landing, the scarf falls. */
  recover: {
    hips: { y: -0.04, rot: [0, -12, 0] },
    feet: { L: [0.12, A, 0.12], R: [-0.12, A, -0.12] },
    hands: { L: 'open', R: 'open' },
    joints: { chest: [2, -4, 0], neck: [4, 0, 0], head: [6, -4, 0], ...armL(8, 12, 18), ...armR(10, 12, 22) },
  },
} satisfies Record<string, PoseSpec>

export type AeronPose = keyof typeof spec
export const AERON_POSE_SPECS: Readonly<Record<AeronPose, PoseSpec>> = spec
export const AERON_POSES = Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, compilePose(v)])) as Record<AeronPose, ReturnType<typeof compilePose>>
