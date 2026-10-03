import { armL, armR, compilePose, legL, legR, type PoseSpec } from '../pose'
import type { Proportions } from '../skeleton'

/** VELOCITY: lean, long-limbed, sharp. */
export const VELOCITY_PROPORTIONS: Proportions = {
  hipHeight: 0.95,
  spine: 0.13,
  chest: 0.2,
  neck: 0.25,
  head: 0.24,
  shoulderWidth: 0.46,
  upperArm: 0.29,
  foreArm: 0.27,
  hand: 0.15,
  hipWidth: 0.2,
  thigh: 0.45,
  shin: 0.46,
}

const spec = {
  /** Reveal: head bowed while the body reconstructs. */
  assemble: { hips: { y: -0.04 }, joints: { spine: [12, 0, 0], chest: [8, 0, 0], head: [38, 0, 0], ...armL(4, 16, 22), ...armR(4, 16, 22), ...legL(2, 5, 6), ...legR(2, 5, 6) } },
  idle: { hips: { y: -0.02 }, joints: { spine: [3, 0, 0], chest: [2, 0, 0], head: [-3, 0, 0], ...armL(8, 12, 18), ...armR(8, 12, 18), ...legL(4, 5, 8), ...legR(4, 5, 8) } },
  /** Fighting stance: lead side forward, blade hand extended, rear hand guarding. */
  ready: {
    hips: { y: -0.13, rot: [0, 28, 0] },
    joints: { spine: [8, -12, 0], chest: [6, -14, 0], head: [-4, -10, 0], ...armL(72, 14, 72), ...armR(38, 12, 112), ...legL(28, 7, 34, -10), ...legR(-22, 7, 36, 16) },
  },
  /** Anticipation: coiled low, arms swept back, eyes on the target. */
  crouch: {
    hips: { y: -0.42, z: -0.06 },
    joints: { spine: [28, 0, 0], chest: [20, 0, 0], head: [-38, 0, 0], ...armL(-42, 22, 24), ...armR(-42, 22, 24), ...legL(78, 8, 118, -18), ...legR(18, 8, 112, 12) },
  },
  /** Full sprint/dash lean, streamlined. */
  dash: {
    hips: { y: -0.12, rot: [42, 0, 0] },
    joints: { spine: [10, 0, 0], chest: [6, 0, 0], head: [-48, 0, 0], ...armL(-62, 14, 12), ...armR(-62, 14, 12), ...legL(32, 4, 64), ...legR(-34, 4, 44, 30) },
  },
  /** Lunging thrust: right blade hand fully extended. */
  thrust: {
    hips: { y: -0.2, z: 0.1, rot: [16, -32, 0] },
    joints: { spine: [6, -14, 0], chest: [4, -18, 0], head: [-12, 30, 0], ...armR(92, 2, 0), ...armL(-42, 26, 62), ...legL(48, 5, 52, -16), ...legR(-38, 5, 18, 22) },
  },
  /** Skid landing: low, balance arm out. */
  land: {
    hips: { y: -0.5, rot: [18, 0, 0] },
    joints: { spine: [14, 0, 8], chest: [6, 0, 0], head: [-26, 0, 0], ...armL(42, 52, 40), ...armR(-24, 32, 12), ...legL(82, 24, 112, -10), ...legR(-12, 28, 82, 30) },
  },
  /** Aerial tuck for flips. */
  flip: {
    hips: { y: 0.05 },
    joints: { spine: [30, 0, 0], chest: [24, 0, 0], head: [24, 0, 0], ...armL(62, 22, 118), ...armR(62, 22, 118), ...legL(112, 10, 140), ...legR(112, 10, 140) },
  },
  jab: {
    hips: { y: -0.14, rot: [6, 26, 0] },
    joints: { spine: [4, 8, 0], chest: [2, 18, 0], head: [0, -28, 0], ...armL(90, 6, 0), ...armR(42, 12, 112), ...legL(30, 7, 32, -10), ...legR(-24, 7, 34, 16) },
  },
  /** High side kick, body counter-leaning. */
  spinKick: {
    hips: { y: 0.02, rot: [0, -20, -32] },
    joints: { spine: [0, 0, -14], chest: [0, 0, -6], head: [0, 0, 32], ...legL(86, 68, 6, -10), ...legR(0, 0, 18), ...armL(10, 72, 20), ...armR(22, 82, 30) },
  },
  /** Rising strike: arm driving upward, knee up. */
  rising: {
    hips: { y: 0.04, rot: [-10, -22, 0] },
    joints: { spine: [-16, -10, 0], chest: [-10, -10, 0], head: [-26, 14, 0], ...armR(168, 10, 8), ...armL(-32, 32, 52), ...legL(64, 5, 74), ...legR(-12, 5, 12, 30) },
  },
  /** Anchor throw — wind-up. */
  throwWind: {
    hips: { y: -0.1, rot: [0, 42, 0] },
    joints: { spine: [-4, 24, 0], chest: [-4, 20, 0], head: [0, -54, 0], ...armR(-32, 84, 100), ...armL(72, 18, 28), ...legL(32, 8, 36, -10), ...legR(-22, 8, 32, 16) },
  },
  /** Anchor throw — release and follow-through across the body. */
  throw: {
    hips: { y: -0.16, rot: [12, -36, 0] },
    joints: { spine: [10, -20, 0], chest: [10, -26, 0], head: [-6, 36, 0], ...armR(82, -26, 6), ...armL(-32, 36, 42), ...legL(48, 8, 42, -14), ...legR(-36, 8, 26, 24) },
  },
  /** Leap: one knee driving, lead arm reaching. */
  leap: {
    hips: { rot: [22, 0, 0] },
    joints: { spine: [14, 0, 0], head: [-32, 0, 0], ...armL(122, 30, 20), ...armR(-42, 22, 32), ...legL(92, 8, 122), ...legR(-22, 8, 62, 20) },
  },
  /** Inverted hold of the Code Core (the fighter root is pitched upside-down). */
  coreHold: {
    hips: { rot: [-8, 0, 0] },
    joints: { spine: [-10, 0, 0], chest: [-6, 0, 0], head: [-38, 0, 0], ...armR(168, 10, 18), ...armL(146, 22, 46), ...legL(42, 12, 92), ...legR(74, 12, 124) },
  },
  /** Anticipation for the slam: arm cocks back a few degrees. */
  coreCock: {
    hips: { rot: [-14, 0, 0] },
    joints: { spine: [-18, 0, 0], chest: [-10, 0, 0], head: [-30, 0, 0], ...armR(138, 14, 48), ...armL(150, 26, 50), ...legL(30, 12, 80), ...legR(62, 12, 112) },
  },
  /** The slam: arm fully driven through. */
  strike: {
    hips: { rot: [8, 0, 0] },
    joints: { spine: [-20, 0, 0], chest: [-12, 0, 0], head: [-46, 0, 0], ...armR(180, 0, 0), ...armL(122, 42, 62), ...legL(-10, 10, 22), ...legR(12, 10, 44) },
  },
  /** Aftermath: one knee down, striking arm extended to the ground. */
  heroLand: {
    hips: { y: -0.46, rot: [8, 0, 0] },
    joints: { spine: [20, 0, 0], chest: [10, 0, 0], head: [-26, 0, 0], ...armR(42, 30, 10), ...armL(-22, 42, 30), ...legL(86, 10, 116, -14), ...legR(-26, 10, 128, 40) },
  },
} satisfies Record<string, PoseSpec>

export type VelocityPose = keyof typeof spec
export const VELOCITY_POSES = Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, compilePose(v as PoseSpec)])) as Record<VelocityPose, ReturnType<typeof compilePose>>
