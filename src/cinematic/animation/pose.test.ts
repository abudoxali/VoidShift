import { Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { CharacterRig } from './CharacterRig'
import { VELOCITY_POSES, VELOCITY_PROPORTIONS } from './poses/velocityPoses'
import { VOID_POSES, VOID_PROPORTIONS } from './poses/voidPoses'
import { blendPoses, compilePose } from './pose'
import { JOINTS } from './skeleton'

const world = (rig: CharacterRig, name: (typeof JOINTS)[number]) => {
  rig.root.updateMatrixWorld(true)
  return rig.jointWorld(name, new Vector3())
}

describe('pose system', () => {
  it('compiles every authored pose to unit quaternions for every joint', () => {
    for (const library of [VELOCITY_POSES, VOID_POSES]) {
      for (const pose of Object.values(library)) {
        expect(pose.rotations).toHaveLength(JOINTS.length)
        for (const q of pose.rotations) expect(q.length()).toBeCloseTo(1, 6)
      }
    }
  })

  it('an empty pose is the rest pose', () => {
    const rest = compilePose({ joints: {} })
    for (const q of rest.rotations) expect(q.equals(new Quaternion())).toBe(true)
  })

  it('blending is exact at the ends and continuous in between', () => {
    const a = VELOCITY_POSES.ready
    const b = VELOCITY_POSES.thrust
    const out = { rotations: JOINTS.map(() => new Quaternion()), hipsOffset: new Vector3() }
    blendPoses(a, b, 0, out)
    out.rotations.forEach((q, i) => expect(q.angleTo(a.rotations[i])).toBeLessThan(1e-6))
    blendPoses(a, b, 1, out)
    out.rotations.forEach((q, i) => expect(q.angleTo(b.rotations[i])).toBeLessThan(1e-6))
    blendPoses(a, b, 0.5, out)
    out.rotations.forEach((q, i) => {
      const total = a.rotations[i].angleTo(b.rotations[i])
      expect(q.angleTo(a.rotations[i])).toBeLessThanOrEqual(total + 1e-6)
    })
  })
})

describe('CharacterRig', () => {
  it('builds a humanoid: head above chest above hips above feet; hands at the sides', () => {
    const rig = new CharacterRig(VELOCITY_PROPORTIONS)
    rig.apply(VELOCITY_POSES.idle, VELOCITY_POSES.idle, 1, { time: 0, breath: 0, jitter: 0 })
    const head = world(rig, 'head')
    const chest = world(rig, 'chest')
    const hips = world(rig, 'hips')
    const foot = world(rig, 'footL')
    expect(head.y).toBeGreaterThan(chest.y)
    expect(chest.y).toBeGreaterThan(hips.y)
    expect(hips.y).toBeGreaterThan(foot.y)
    expect(world(rig, 'handL').x).toBeGreaterThan(0)
    expect(world(rig, 'handR').x).toBeLessThan(0)
  })

  it('limbs move between poses (not just the root)', () => {
    const rig = new CharacterRig(VELOCITY_PROPORTIONS)
    rig.apply(VELOCITY_POSES.ready, VELOCITY_POSES.ready, 1, { time: 0, breath: 0, jitter: 0 })
    const handBefore = world(rig, 'handR').clone()
    const footBefore = world(rig, 'footR').clone()
    rig.apply(VELOCITY_POSES.ready, VELOCITY_POSES.thrust, 1, { time: 0, breath: 0, jitter: 0 })
    expect(world(rig, 'handR').distanceTo(handBefore)).toBeGreaterThan(0.25)
    rig.apply(VELOCITY_POSES.ready, VELOCITY_POSES.spinKick, 1, { time: 0, breath: 0, jitter: 0 })
    expect(world(rig, 'footR').distanceTo(footBefore) + world(rig, 'footL').distanceTo(footBefore)).toBeGreaterThan(0.3)
  })

  it('VOID is taller and broader than VELOCITY', () => {
    const v = new CharacterRig(VELOCITY_PROPORTIONS)
    const d = new CharacterRig(VOID_PROPORTIONS)
    v.apply(VELOCITY_POSES.idle, VELOCITY_POSES.idle, 1, { time: 0, breath: 0, jitter: 0 })
    d.apply(VOID_POSES.stand, VOID_POSES.stand, 1, { time: 0, breath: 0, jitter: 0 })
    expect(world(d, 'head').y).toBeGreaterThan(world(v, 'head').y)
    const span = (r: CharacterRig) => world(r, 'shoulderL').distanceTo(world(r, 'shoulderR'))
    expect(span(d)).toBeGreaterThan(span(v))
  })

  it('apply is pure: the same inputs give the same skeleton', () => {
    const rig = new CharacterRig(VOID_PROPORTIONS)
    const opts = { time: 3.7, breath: 1, jitter: 0.5 }
    rig.apply(VOID_POSES.guard, VOID_POSES.counter, 0.4, opts)
    const a = world(rig, 'handL').clone()
    rig.apply(VOID_POSES.collapse, VOID_POSES.reach, 0.9, opts)
    rig.apply(VOID_POSES.guard, VOID_POSES.counter, 0.4, opts)
    expect(world(rig, 'handL').distanceTo(a)).toBeLessThan(1e-9)
  })
})
