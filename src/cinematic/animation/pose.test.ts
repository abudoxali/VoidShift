import { Group, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { AERON_PROPORTIONS } from '../characters/Aeron/aeronDesign'
import { NOX_PROPORTIONS } from '../characters/Nox/noxDesign'
import { CharacterRig } from './CharacterRig'
import { AERON_POSES, AERON_POSE_SPECS } from './poses/aeronPoses'
import { NOX_POSES } from './poses/noxPoses'
import { blendPoses, compilePose } from './pose'
import { JOINTS } from './skeleton'

const opts = { time: 0, breath: 0, jitter: 0 }
const world = (rig: CharacterRig, name: (typeof JOINTS)[number]) => {
  rig.root.updateMatrixWorld(true)
  return rig.jointWorld(name, new Vector3())
}

describe('pose system', () => {
  it('compiles every authored pose to unit quaternions for every joint', () => {
    for (const library of [AERON_POSES, NOX_POSES]) {
      for (const pose of Object.values(library)) {
        expect(pose.rotations).toHaveLength(JOINTS.length)
        for (const q of pose.rotations) expect(q.length()).toBeCloseTo(1, 6)
      }
    }
  })

  it('blending is exact at the ends', () => {
    const a = AERON_POSES.guard
    const b = AERON_POSES.cross
    const out = { rotations: JOINTS.map(() => new Quaternion()), hipsOffset: new Vector3() }
    blendPoses(a, b, 0, out)
    out.rotations.forEach((q, i) => expect(q.angleTo(a.rotations[i])).toBeLessThan(1e-6))
    blendPoses(a, b, 1, out)
    out.rotations.forEach((q, i) => expect(q.angleTo(b.rotations[i])).toBeLessThan(1e-6))
  })

  it('carries hand shapes (fists in combat, open when forming the anchor)', () => {
    expect(AERON_POSES.guard.handR).toBe('fist')
    expect(AERON_POSES.cross.handR).toBe('fist')
    expect(compilePose({ joints: {} }).handL).toBe('open')
    const rig = new CharacterRig(AERON_PROPORTIONS)
    rig.apply(AERON_POSES.guard, AERON_POSES.stand, 0.4, opts)
    expect(rig.handR).toBe('fist')
    rig.apply(AERON_POSES.guard, AERON_POSES.stand, 0.6, opts)
    expect(rig.handR).toBe('open')
  })
})

describe('CharacterRig', () => {
  it('is a humanoid: head above chest above hips above feet', () => {
    const rig = new CharacterRig(AERON_PROPORTIONS)
    rig.apply(AERON_POSES.stand, AERON_POSES.stand, 1, opts)
    expect(world(rig, 'head').y).toBeGreaterThan(world(rig, 'chest').y)
    expect(world(rig, 'chest').y).toBeGreaterThan(world(rig, 'hips').y)
    expect(world(rig, 'hips').y).toBeGreaterThan(world(rig, 'footL').y)
  })

  it('leg IK plants every grounded foot on its target', () => {
    const rig = new CharacterRig(AERON_PROPORTIONS)
    const holder = new Group()
    holder.add(rig.root)
    for (const [name, spec] of Object.entries(AERON_POSE_SPECS)) {
      if (!spec.feet) continue
      rig.apply(AERON_POSES[name as keyof typeof AERON_POSES], AERON_POSES[name as keyof typeof AERON_POSES], 1, opts)
      for (const side of ['L', 'R'] as const) {
        const target = spec.feet[side]
        if (!target) continue
        const reach = AERON_PROPORTIONS.thigh + AERON_PROPORTIONS.shin
        const foot = world(rig, `foot${side}`)
        const hip = world(rig, `thigh${side}`)
        // Reachable targets are hit; unreachable ones are approached along the leg.
        if (hip.distanceTo(new Vector3(...target)) < reach - 0.01) expect(foot.distanceTo(new Vector3(...target)), `${name}.${side}`).toBeLessThan(0.01)
      }
    }
  })

  it('limbs actually move between poses (not just the root)', () => {
    const rig = new CharacterRig(AERON_PROPORTIONS)
    rig.apply(AERON_POSES.guard, AERON_POSES.guard, 1, opts)
    const hand = world(rig, 'handR').clone()
    rig.apply(AERON_POSES.guard, AERON_POSES.cross, 1, opts)
    expect(world(rig, 'handR').distanceTo(hand)).toBeGreaterThan(0.3)
  })

  it('NOX is taller and broader than AERON', () => {
    const a = new CharacterRig(AERON_PROPORTIONS)
    const n = new CharacterRig(NOX_PROPORTIONS)
    a.apply(AERON_POSES.stand, AERON_POSES.stand, 1, opts)
    n.apply(NOX_POSES.stand, NOX_POSES.stand, 1, opts)
    expect(world(n, 'head').y).toBeGreaterThan(world(a, 'head').y)
    const span = (r: CharacterRig) => world(r, 'upperArmL').distanceTo(world(r, 'upperArmR'))
    expect(span(n)).toBeGreaterThan(span(a))
  })

  it('apply is pure: the same inputs give the same skeleton', () => {
    const rig = new CharacterRig(NOX_PROPORTIONS)
    const o = { time: 3.7, breath: 1, jitter: 0.5 }
    rig.apply(NOX_POSES.guard, NOX_POSES.elbow, 0.4, o)
    const a = world(rig, 'handL').clone()
    rig.apply(NOX_POSES.collapse, NOX_POSES.grab, 0.9, o)
    rig.apply(NOX_POSES.guard, NOX_POSES.elbow, 0.4, o)
    expect(world(rig, 'handL').distanceTo(a)).toBeLessThan(1e-9)
  })
})
