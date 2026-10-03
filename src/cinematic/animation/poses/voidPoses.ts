import { armL, armR, compilePose, legL, legR, type PoseSpec } from '../pose'
import type { Proportions } from '../skeleton'

/** VOID: taller, heavier, wide shoulders. */
export const VOID_PROPORTIONS: Proportions = {
  hipHeight: 1.0,
  spine: 0.15,
  chest: 0.24,
  neck: 0.27,
  head: 0.26,
  shoulderWidth: 0.58,
  upperArm: 0.32,
  foreArm: 0.3,
  hand: 0.17,
  hipWidth: 0.25,
  thigh: 0.48,
  shin: 0.49,
}

const spec = {
  /** Reveal: folded down, unfolding out of the tear. */
  hunch: { hips: { y: -0.36 }, joints: { spine: [42, 0, 0], chest: [26, 0, 0], head: [32, 0, 0], ...armL(16, 10, 22), ...armR(16, 10, 22), ...legL(56, 10, 82), ...legR(46, 10, 82) } },
  /** Calm, upright, arms loose — unnervingly still. */
  stand: { joints: { spine: [-3, 0, 0], chest: [-4, 0, 0], head: [4, 0, 0], ...armL(4, 10, 8), ...armR(4, 10, 8), ...legL(0, 5, 2), ...legR(0, 5, 2) } },
  guard: {
    hips: { y: -0.06, rot: [0, 16, 0] },
    joints: { spine: [2, 0, 0], chest: [0, 10, 0], head: [0, -22, 0], ...armL(56, 20, 96), ...armR(10, 16, 32), ...legL(16, 8, 16), ...legR(-10, 8, 16, 8) },
  },
  block: {
    hips: { y: -0.12, rot: [0, 10, 0] },
    joints: { chest: [-6, 16, 0], head: [6, -14, 0], ...armL(82, 10, 132), ...armR(42, 30, 92), ...legL(18, 8, 22), ...legR(-14, 8, 22, 10) },
  },
  /** Phase: the body opens and leans away from causality. */
  phaseLean: {
    hips: { rot: [-10, 0, 0] },
    joints: { spine: [-12, 0, 8], chest: [-8, 0, 6], head: [10, 0, -12], ...armL(30, 62, 22), ...armR(30, 62, 22), ...legL(4, 6, 4), ...legR(4, 6, 4) },
  },
  counter: {
    hips: { y: -0.16, z: 0.1, rot: [10, -30, 0] },
    joints: { chest: [6, -20, 0], head: [0, 30, 0], ...armR(90, -6, 6), ...armL(-22, 32, 42), ...legL(42, 8, 42, -10), ...legR(-32, 8, 22, 20) },
  },
  reach: {
    hips: { y: -0.05 },
    joints: { spine: [-10, -16, 0], chest: [-6, -8, 0], head: [-32, 0, 0], ...armR(140, 10, 10), ...armL(30, 32, 42), ...legL(6, 8, 8), ...legR(-6, 8, 8) },
  },
  /** Realisation: the head snaps round over the shoulder. */
  realize: { joints: { spine: [0, 16, 0], chest: [0, 30, 0], head: [-18, 70, 0], ...armL(20, 26, 40), ...armR(16, 22, 32), ...legL(8, 8, 10), ...legR(-6, 8, 10) } },
  recoil: {
    hips: { y: -0.3, rot: [-26, 0, 10] },
    joints: { spine: [-30, 0, 10], chest: [-20, 0, 0], head: [-42, 0, 16], ...armL(62, 82, 30), ...armR(72, 76, 20), ...legL(32, 16, 62), ...legR(10, 16, 72) },
  },
  collapse: {
    hips: { y: -0.62 },
    joints: { spine: [42, 0, 6], chest: [22, 0, 0], head: [32, 0, 10], ...armL(42, 20, 30), ...armR(10, 32, 62), ...legL(92, 10, 132, -20), ...legR(-12, 10, 150, 30) },
  },
} satisfies Record<string, PoseSpec>

export type VoidPose = keyof typeof spec
export const VOID_POSES = Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, compilePose(v as PoseSpec)])) as Record<VoidPose, ReturnType<typeof compilePose>>
