import { Group, LineSegments, Mesh, MeshBasicMaterial } from 'three'
import { describe, expect, it } from 'vitest'
import { CharacterRig } from '../animation/CharacterRig'
import { VELOCITY_POSES, VELOCITY_PROPORTIONS } from '../animation/poses/velocityPoses'
import { VOID_PROPORTIONS } from '../animation/poses/voidPoses'
import { buildVelocityBody } from './VelocityFighter/buildVelocityBody'
import { buildVoidBody } from './VoidFighter/buildVoidBody'
import { createFighterUniforms } from './fighterMaterials'
import { RigidBatch } from './RigidBatch'

function velocity() {
  const rig = new CharacterRig(VELOCITY_PROPORTIONS)
  const root = new Group()
  root.add(rig.root)
  buildVelocityBody(rig, createFighterUniforms([1, 1, 1]), VELOCITY_PROPORTIONS)
  return { rig, root }
}

describe('RigidBatch', () => {
  it('draws a whole fighter through one object per material', () => {
    const { root } = velocity()
    const batch = new RigidBatch(root, 'velocity')
    expect(batch.partCount).toBeGreaterThan(40)
    expect(batch.drawCount).toBe(3)
    const v = new CharacterRig(VOID_PROPORTIONS)
    const vRoot = new Group()
    vRoot.add(v.root)
    buildVoidBody(v, createFighterUniforms([1, 1, 1]), VOID_PROPORTIONS)
    expect(new RigidBatch(vRoot, 'void').drawCount).toBeLessThanOrEqual(5)
  })

  it('hides the batched originals but keeps every vertex', () => {
    const { root } = velocity()
    let vertices = 0
    root.traverse((o) => {
      const d = o as Mesh | LineSegments
      if ((d as Mesh).isMesh || (d as LineSegments).isLineSegments) {
        const g = d.geometry
        vertices += g.index ? g.index.count : g.getAttribute('position').count
      }
    })
    const batch = new RigidBatch(root, 'velocity')
    let merged = 0
    for (const c of batch.group.children) merged += (c as Mesh).geometry.getAttribute('position').count
    expect(merged).toBe(vertices)
    root.traverse((o) => {
      if ((o as Mesh).isMesh || (o as LineSegments).isLineSegments) expect(o.visible).toBe(false)
    })
  })

  it('tracks the pose: each part matrix follows its joint', () => {
    const { rig, root } = velocity()
    const batch = new RigidBatch(root, 'velocity')
    const data = (batch as unknown as { data: Float32Array }).data.slice()
    rig.apply(VELOCITY_POSES.idle, VELOCITY_POSES.spinKick, 1, { time: 0, breath: 0, jitter: 0 })
    batch.update()
    const after = (batch as unknown as { data: Float32Array }).data
    let changed = 0
    for (let i = 0; i < after.length; i += 16) if (Math.abs(after[i + 12] - data[i + 12]) + Math.abs(after[i + 13] - data[i + 13]) > 1e-4) changed++
    expect(changed).toBeGreaterThan(10)
  })

  it('skips parts whose material never draws, and follows visibility', () => {
    const root = new Group()
    const hidden = new MeshBasicMaterial()
    hidden.visible = false
    root.add(new Mesh(undefined, hidden))
    const batch = new RigidBatch(root, 'x')
    expect(batch.partCount).toBe(0)
    batch.update(false)
    expect(batch.group.visible).toBe(false)
  })
})
