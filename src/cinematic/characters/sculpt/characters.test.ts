/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { Vector3, Vector4 } from 'three'
import { describe, expect, it } from 'vitest'
import { CharacterRig } from '../../animation/CharacterRig'
import { JOINTS } from '../../animation/skeleton'
import type { QualityTier } from '../../types'
import { FIGHTER_KITS } from '../designs'
import { decodeCharacter, designSignature, encodeCharacter } from './bake'
import { applyExpression, blinkAt, EXPRESSIONS } from './expressions'
import { toCharacterGeometry, type CharacterArrays, type Skinned } from './generate'
import { meshField } from './mesher'
import { fnField } from './sdf'
import { SculptedFighter } from './SculptedFighter'

const baked = (id: 'aeron' | 'nox', tier: QualityTier) => {
  const raw = gunzipSync(readFileSync(`public/characters/${id}-${tier.toLowerCase()}.bin.gz`))
  return decodeCharacter(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer)
}

describe('baked fighters', () => {
  for (const id of ['aeron', 'nox'] as const)
    for (const tier of ['HIGH', 'LITE'] as const) {
      it(`${id} ${tier}: current with its design, normalised weights, valid bones, every hand shape`, { timeout: 60_000 }, () => {
        const { signature, arrays } = baked(id, tier)
        // A design edit without `npm run bake` fails here.
        expect(signature).toBe(designSignature(FIGHTER_KITS[id].design, tier))
        for (const name of ['body', 'head', 'hair', 'armor'] as const) {
          const m = arrays[name]
          const n = m.positions.length / 3
          expect(n).toBeGreaterThan(500)
          for (let i = 0; i < n; i += 11) {
            const sum = m.skinWeight[i * 4] + m.skinWeight[i * 4 + 1] + m.skinWeight[i * 4 + 2] + m.skinWeight[i * 4 + 3]
            expect(Math.abs(sum - 1)).toBeLessThan(0.02)
            for (let k = 0; k < 4; k++) expect(m.skinIndex[i * 4 + k]).toBeLessThan(JOINTS.length)
          }
          for (let i = 0; i < m.indices.length; i += 97) expect(m.indices[i]).toBeLessThan(n)
        }
        const hands = new Set<number>()
        for (const h of arrays.body.extra!.aHand.array) hands.add(h)
        expect([...hands].sort()).toEqual([0, 1, 2, 3, 4, 5, 6])
        const extentY = (m: Skinned) => {
          let lo = Infinity, hi = -Infinity
          for (let i = 1; i < m.positions.length; i += 3) {
            lo = Math.min(lo, m.positions[i])
            hi = Math.max(hi, m.positions[i])
          }
          return [lo, hi]
        }
        const minY = (m: Skinned) => extentY(m)[0]
        const maxY = (m: Skinned) => extentY(m)[1]
        expect(minY(arrays.body)).toBeGreaterThan(-0.03)
        expect(minY(arrays.body)).toBeLessThan(0.025)
        // NOX stands taller than AERON (crown and hair included).
        expect(maxY(arrays.hair)).toBeGreaterThan(id === 'nox' ? 1.75 : 1.65)
        expect(maxY(arrays.hair)).toBeLessThan(2.0)
      })
    }

  it('binds exactly: at the bind pose skinned vertices equal the rest geometry; posing moves the head', { timeout: 60_000 }, () => {
    const { arrays } = baked('aeron', 'LITE')
    const geo = toCharacterGeometry(arrays)
    const rig = new CharacterRig(FIGHTER_KITS.aeron.design.proportions)
    rig.root.position.set(1, 0, -2)
    const body = new SculptedFighter(FIGHTER_KITS.aeron.design, rig, geo, FIGHTER_KITS.aeron.paint)
    body.attach(rig)
    rig.root.updateMatrixWorld(true)
    const head = body.meshes.head
    head.skeleton.update()
    const v = new Vector3()
    for (const i of [0, 500, 2000]) {
      head.getVertexPosition(i, v).applyMatrix4(head.matrixWorld)
      const rest = new Vector3().fromBufferAttribute(geo.head.getAttribute('position'), i).add(rig.root.position)
      expect(v.distanceTo(rest)).toBeLessThan(1e-4)
    }
    const before = head.getVertexPosition(0, new Vector3()).applyMatrix4(head.matrixWorld)
    const pose = FIGHTER_KITS.aeron.poses.duck
    rig.apply(pose, pose, 1, { time: 0, breath: 0, jitter: 0 })
    rig.root.updateMatrixWorld(true)
    head.skeleton.update()
    const after = head.getVertexPosition(0, new Vector3()).applyMatrix4(head.matrixWorld)
    expect(before.y - after.y).toBeGreaterThan(0.15)
    body.dispose()
  })
})

describe('sculpt kernel', () => {
  it('meshes a sphere with vertices on the surface', () => {
    const m = meshField(fnField((p) => Math.hypot(p[0], p[1], p[2]) - 0.1), [-0.15, -0.15, -0.15], [0.15, 0.15, 0.15], 0.01)
    expect(m.indices.length).toBeGreaterThan(1000)
    for (let i = 0; i < m.positions.length; i += 3) expect(Math.abs(Math.hypot(m.positions[i], m.positions[i + 1], m.positions[i + 2]) - 0.1)).toBeLessThan(0.002)
  })

  it('encodes and decodes a character within quantisation error', () => {
    const m = meshField(fnField((p) => Math.hypot(p[0], p[1] - 1, p[2]) - 0.2), [-0.3, 0.7, -0.3], [0.3, 1.3, 0.3], 0.02)
    const n = m.positions.length / 3
    const sk: Skinned = { ...m, skinIndex: new Uint16Array(n * 4).fill(3), skinWeight: new Float32Array(n * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), zone: new Float32Array(n).fill(4), extra: { aHairT: { array: new Float32Array(n).fill(0.5), size: 1 } } }
    const a: CharacterArrays = { body: sk, head: sk, hair: sk, armor: sk, headBind: [0, 1.5, 0], stats: { triangles: 1, ms: 1 } }
    const bytes = encodeCharacter(a, 'abc')
    const { signature, arrays } = decodeCharacter(bytes.buffer as ArrayBuffer)
    expect(signature).toBe('abc')
    for (let i = 0; i < m.positions.length; i++) expect(Math.abs(arrays.body.positions[i] - m.positions[i])).toBeLessThan(1e-4)
    expect(arrays.hair.extra!.aHairT.array[3]).toBeCloseTo(0.5, 2)
    expect(arrays.armor.zone[0]).toBe(4)
  })

  it('expressions blend deterministically; blinks are brief and repeatable', () => {
    const e = new Vector4(), mo = new Vector4()
    applyExpression('neutral', 'strain', 0.5, e, mo)
    expect(e.x).toBeCloseTo((EXPRESSIONS.neutral.expr[0] + EXPRESSIONS.strain.expr[0]) / 2)
    let closed = 0
    for (let t = 0; t < 10; t += 0.01) if (blinkAt(t, 0) > 0.5) closed++
    expect(closed).toBeGreaterThan(2)
    expect(closed).toBeLessThan(60)
    expect(blinkAt(4.321, 2)).toBe(blinkAt(4.321, 2))
  })
})
