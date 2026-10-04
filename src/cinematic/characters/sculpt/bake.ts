import type { QualityTier } from '../../types'
import type { CharacterDesign } from './design'
import { Frames } from './frames'
import { GENERATOR_VERSION, HAND_SHAPES, SCULPT_RESOLUTION, type CharacterArrays, type Skinned } from './generate'

/**
 * Baked fighter geometry: the sculpt output quantised into one compact binary (int16 positions,
 * int8 normals / strands, uint8 skin indices / weights / zones / hair t), gzipped by the bake
 * script. A signature of the design inputs travels with it, so the runtime knows when a baked
 * file is stale (design edited in development) and regenerates instead.
 */

const MAGIC = 0x31435356 // 'VSC1'
const MESHES = ['body', 'head', 'hair', 'armor'] as const

/** FNV-1a over the design's resolved inputs (primitives, hair, palette-independent). */
export function designSignature(design: CharacterDesign, tier: QualityTier): string {
  const f = new Frames(design.proportions)
  const parts: unknown[] = [GENERATOR_VERSION, SCULPT_RESOLUTION[tier], design.headBounds, design.body(f).prims, design.head(f).prims, design.hair(f)]
  for (const side of ['L', 'R'] as const) for (const s of HAND_SHAPES) parts.push(design.hand(f, side, s).prims)
  for (const a of design.armor(f)) parts.push({ ...a, region: a.region.prims, extra: a.extra?.prims ?? null })
  const text = JSON.stringify(parts, (_, v: unknown) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v))
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

interface MeshHeader {
  vertices: number
  indices: number
  min: [number, number, number]
  max: [number, number, number]
  extras: Record<string, number>
}

interface Header {
  signature: string
  headBind: [number, number, number]
  stats: { triangles: number; ms: number }
  meshes: Record<(typeof MESHES)[number], MeshHeader>
}

class Writer {
  private chunks: Uint8Array[] = []
  length = 0
  push(a: ArrayBufferView): void {
    const bytes = new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
    this.chunks.push(bytes.slice())
    this.length += bytes.byteLength
    const pad = (4 - (this.length % 4)) % 4
    if (pad) {
      this.chunks.push(new Uint8Array(pad))
      this.length += pad
    }
  }
  concat(): Uint8Array {
    const out = new Uint8Array(this.length)
    let o = 0
    for (const c of this.chunks) {
      out.set(c, o)
      o += c.byteLength
    }
    return out
  }
}

const q8 = (v: number) => Math.max(-127, Math.min(127, Math.round(v * 127)))

export function encodeCharacter(a: CharacterArrays, signature: string): Uint8Array {
  const w = new Writer()
  const header: Header = { signature, headBind: [...a.headBind] as [number, number, number], stats: a.stats, meshes: {} as Header['meshes'] }
  for (const name of MESHES) {
    const m: Skinned = a[name]
    const n = m.positions.length / 3
    const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], m.positions[i * 3 + k])
      max[k] = Math.max(max[k], m.positions[i * 3 + k])
    }
    const pos = new Uint16Array(n * 3)
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] = Math.round(((m.positions[i * 3 + k] - min[k]) / Math.max(max[k] - min[k], 1e-9)) * 65535)
    const nor = new Int8Array(n * 3)
    for (let i = 0; i < n * 3; i++) nor[i] = q8(m.normals[i])
    const si = new Uint8Array(n * 4)
    const sw = new Uint8Array(n * 4)
    for (let i = 0; i < n * 4; i++) {
      si[i] = m.skinIndex[i]
      sw[i] = Math.round(m.skinWeight[i] * 255)
    }
    const zone = new Uint8Array(n)
    for (let i = 0; i < n; i++) zone[i] = m.zone[i]
    w.push(pos)
    w.push(nor)
    w.push(si)
    w.push(sw)
    w.push(zone)
    w.push(m.indices)
    const extras: Record<string, number> = {}
    for (const [key, { array, size }] of Object.entries(m.extra ?? {})) {
      extras[key] = size
      if (key === 'aHand') w.push(Uint8Array.from(array))
      else if (key === 'aHairT') w.push(Uint8Array.from(array, (v) => Math.round(v * 255)))
      else w.push(Int8Array.from(array, q8))
    }
    header.meshes[name] = { vertices: n, indices: m.indices.length, min, max, extras }
  }
  const json = new TextEncoder().encode(JSON.stringify(header))
  const body = w.concat()
  const headLen = json.byteLength + ((4 - (json.byteLength % 4)) % 4)
  const out = new Uint8Array(8 + headLen + body.byteLength)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, MAGIC, true)
  dv.setUint32(4, headLen, true)
  out.set(json, 8)
  out.fill(32, 8 + json.byteLength, 8 + headLen)
  out.set(body, 8 + headLen)
  return out
}

export function decodeCharacter(buffer: ArrayBuffer): { signature: string; arrays: CharacterArrays } {
  const dv = new DataView(buffer)
  if (dv.getUint32(0, true) !== MAGIC) throw new Error('VoidShift: not a baked character')
  const headLen = dv.getUint32(4, true)
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, headLen))) as Header
  let o = 8 + headLen
  const take = <T>(make: (b: ArrayBuffer, off: number, len: number) => T, bytesPer: number, count: number): T => {
    const v = make(buffer, o, count)
    o += count * bytesPer
    o += (4 - (o % 4)) % 4
    return v
  }
  const meshes = {} as Record<(typeof MESHES)[number], Skinned>
  for (const name of MESHES) {
    const h = header.meshes[name]
    const n = h.vertices
    const pos = take((b, off, len) => new Uint16Array(b, off, len), 2, n * 3)
    const nor = take((b, off, len) => new Int8Array(b, off, len), 1, n * 3)
    const si = take((b, off, len) => new Uint8Array(b, off, len), 1, n * 4)
    const sw = take((b, off, len) => new Uint8Array(b, off, len), 1, n * 4)
    const zone = take((b, off, len) => new Uint8Array(b, off, len), 1, n)
    const indices = take((b, off, len) => new Uint32Array(b.slice(off, off + len * 4)), 4, h.indices)
    const positions = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) positions[i * 3 + k] = h.min[k] + (pos[i * 3 + k] / 65535) * (h.max[k] - h.min[k])
    const normals = Float32Array.from(nor, (v) => v / 127)
    const skinWeight = Float32Array.from(sw, (v) => v / 255)
    const extra: NonNullable<Skinned['extra']> = {}
    for (const [key, size] of Object.entries(h.extras)) {
      if (key === 'aHand') extra[key] = { array: Float32Array.from(take((b, off, len) => new Uint8Array(b, off, len), 1, n * size)), size }
      else if (key === 'aHairT') extra[key] = { array: Float32Array.from(take((b, off, len) => new Uint8Array(b, off, len), 1, n * size), (v) => v / 255), size }
      else extra[key] = { array: Float32Array.from(take((b, off, len) => new Int8Array(b, off, len), 1, n * size), (v) => v / 127), size }
    }
    meshes[name] = { positions, normals, indices, skinIndex: Uint16Array.from(si), skinWeight, zone: Float32Array.from(zone), extra }
  }
  return { signature: header.signature, arrays: { ...meshes, headBind: header.headBind, stats: header.stats } }
}
