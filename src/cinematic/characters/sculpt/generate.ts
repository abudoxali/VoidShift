import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three'
import type { HandShape } from '../../animation/pose'
import { JOINTS, JOINT_INDEX } from '../../animation/skeleton'
import type { QualityTier } from '../../types'
import type { ArmorPiece, CharacterDesign } from './design'
import { Frames } from './frames'
import { buildHairClumps } from './hair'
import { concatMeshes, filterTriangles, meshField, type MeshData } from './mesher'
import { evaluate, primField, smax, smin, type Field, type Prim, type V3 } from './sdf'
import { rigidSkin, skinFromPrims } from './skin'

/** Lattice resolutions (m) per quality tier. Character identity holds on LITE; detail scales. */
export const SCULPT_RESOLUTION: Record<QualityTier, { body: number; head: number; armor: number; cap: number }> = {
  ULTRA: { body: 0.0095, head: 0.0031, armor: 0.0065, cap: 0.0038 },
  HIGH: { body: 0.011, head: 0.0036, armor: 0.0075, cap: 0.0045 },
  LITE: { body: 0.0145, head: 0.0046, armor: 0.0095, cap: 0.0055 },
}

/** Bumped whenever the generator output changes (invalidates baked files). */
export const GENERATOR_VERSION = 4

export const HAND_SHAPES: readonly HandShape[] = ['open', 'fist', 'blade']

export interface CharacterGeometry {
  body: BufferGeometry
  head: BufferGeometry
  hair: BufferGeometry
  armor: BufferGeometry
  /** Head joint position at bind (the face shader works in head-local space). */
  headBind: V3
  stats: { triangles: number; ms: number }
}

export interface Skinned extends MeshData {
  skinIndex: Uint16Array
  skinWeight: Float32Array
  zone: Float32Array
  extra?: Record<string, { array: Float32Array; size: number }>
}

function boundsOf(prims: readonly Prim[], pad: number): [V3, V3] {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
  for (const p of prims) {
    for (let k = 0; k < 3; k++) {
      mn[k] = Math.min(mn[k], p.bc[k] - p.br - pad)
      mx[k] = Math.max(mx[k], p.bc[k] + p.br + pad)
    }
  }
  return [mn as unknown as V3, mx as unknown as V3]
}

function toGeometry(m: Skinned): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(m.positions, 3))
  g.setAttribute('normal', new Float32BufferAttribute(m.normals, 3))
  g.setAttribute('skinIndex', new Uint16BufferAttribute(m.skinIndex, 4))
  g.setAttribute('skinWeight', new Float32BufferAttribute(m.skinWeight, 4))
  g.setAttribute('aZone', new Float32BufferAttribute(m.zone, 1))
  for (const [name, { array, size }] of Object.entries(m.extra ?? {})) g.setAttribute(name, new BufferAttribute(array, size))
  g.setIndex(new BufferAttribute(m.indices, 1))
  g.computeBoundingSphere()
  return g
}

function concatSkinned(parts: readonly Skinned[]): Skinned {
  const mesh = concatMeshes(parts)
  const n = mesh.positions.length / 3
  const skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4), zone = new Float32Array(n)
  const extraNames = new Set<string>()
  for (const p of parts) for (const k of Object.keys(p.extra ?? {})) extraNames.add(k)
  const extra: Skinned['extra'] = {}
  for (const name of extraNames) {
    const size = parts.find((p) => p.extra?.[name])!.extra![name].size
    extra[name] = { array: new Float32Array(n * size), size }
  }
  let o = 0
  for (const p of parts) {
    const c = p.positions.length / 3
    skinIndex.set(p.skinIndex, o * 4)
    skinWeight.set(p.skinWeight, o * 4)
    zone.set(p.zone, o)
    for (const name of extraNames) {
      const src = p.extra?.[name]
      if (src) extra[name].array.set(src.array, o * extra[name].size)
    }
    o += c
  }
  return { ...mesh, skinIndex, skinWeight, zone, extra }
}

const translate = (m: MeshData, t: V3) => {
  for (let i = 0; i < m.positions.length; i += 3) {
    m.positions[i] += t[0]
    m.positions[i + 1] += t[1]
    m.positions[i + 2] += t[2]
  }
}

/** Shell field: a plate whose outer face sits at offset + thickness from the base surface, cut by a
 * region. It is meshed at least `minThick` thick (extra goes inward, under the body) so the
 * lattice never skips a plate thinner than two cells (which would leave holes). */
function shellField(base: Field, piece: ArmorPiece, minThick: number): Field {
  const region = piece.region.prims
  const extra = piece.extra?.prims ?? []
  const outer = piece.offset + piece.thickness
  const thick = Math.max(piece.thickness, minThick)
  const mid = outer - thick / 2
  const half = thick / 2
  const bevel = piece.bevel ?? 0.003
  const combine = (db: number, p: V3) => {
    let d = smax(Math.abs(db - mid) - half, evaluate(region, null, 0, p), bevel)
    if (extra.length) d = combineExtra(d, extra, p)
    return d
  }
  return {
    sample: (p) => combine(base.sample(p), p),
    block(c, r) {
      const b = base.block(c, r)
      return (p) => combine(b(p), p)
    },
  }
}

function combineExtra(d: number, extra: readonly Prim[], p: V3): number {
  for (const pr of extra) {
    const e = evaluate([pr], null, 0, p)
    d = pr.op === 1 ? smax(d, -e, pr.k) : smin(d, e, pr.k)
  }
  return d
}

/** Generated fighter data as transferable typed arrays (worker / bake output). */
export interface CharacterArrays {
  body: Skinned
  head: Skinned
  hair: Skinned
  armor: Skinned
  headBind: V3
  stats: { triangles: number; ms: number }
}

/** Every transferable buffer of a CharacterArrays (for postMessage). */
export function transferables(a: CharacterArrays): ArrayBuffer[] {
  const out: ArrayBuffer[] = []
  for (const m of [a.body, a.head, a.hair, a.armor]) {
    out.push(m.positions.buffer as ArrayBuffer, m.normals.buffer as ArrayBuffer, m.indices.buffer as ArrayBuffer, m.skinIndex.buffer as ArrayBuffer, m.skinWeight.buffer as ArrayBuffer, m.zone.buffer as ArrayBuffer)
    for (const e of Object.values(m.extra ?? {})) out.push(e.array.buffer as ArrayBuffer)
  }
  return [...new Set(out)]
}

export function toCharacterGeometry(a: CharacterArrays): CharacterGeometry {
  return { body: toGeometry(a.body), head: toGeometry(a.head), hair: toGeometry(a.hair), armor: toGeometry(a.armor), headBind: a.headBind, stats: a.stats }
}

const cache = new Map<string, CharacterGeometry>()

export const geometryKey = (id: string, tier: QualityTier) => `${id}:${tier}`

/** Cached geometry if it has been generated or loaded already. */
export function cachedGeometry(id: string, tier: QualityTier): CharacterGeometry | undefined {
  return cache.get(geometryKey(id, tier))
}

export function storeGeometry(id: string, tier: QualityTier, geo: CharacterGeometry): void {
  cache.set(geometryKey(id, tier), geo)
}

/** Synchronous generation (tests, tools); the app loads through the worker (loader.ts). */
export function characterGeometry(design: CharacterDesign, tier: QualityTier): CharacterGeometry {
  const hit = cache.get(geometryKey(design.id, tier))
  if (hit) return hit
  const geo = toCharacterGeometry(generateCharacterArrays(design, tier))
  cache.set(geometryKey(design.id, tier), geo)
  return geo
}

/**
 * Generates a fighter's bind-pose geometry for a quality tier: pure CPU work on typed arrays,
 * safe to run in a worker.
 */
export function generateCharacterArrays(design: CharacterDesign, tier: QualityTier, onStage?: (stage: string, ms: number) => void): CharacterArrays {
  let lap = performance.now()
  const mark = (stage: string) => {
    const now = performance.now()
    onStage?.(stage, now - lap)
    lap = now
  }
  const t0 = performance.now()
  const res = SCULPT_RESOLUTION[tier]
  const f = new Frames(design.proportions)
  const boneCount = JOINTS.length

  // ── Body + hands ──────────────────────────────────────────────────────────
  const bodySculpt = design.body(f)
  const bodyPrims = bodySculpt.prims
  const bodyField = primField(bodyPrims)
  const [bmin, bmax] = boundsOf(bodyPrims, 0.02)
  const pieces = design.armor(f)
  // Skin hidden under covering layers (the coat) is removed: fewer triangles, no poke-through.
  const hiders = pieces.filter((pc) => pc.hides)
  const covered = (x: number, y: number, z: number) => hiders.some((pc) => evaluate(pc.region.prims, null, 0, [x, y, z]) < -(pc.hideInset ?? 0.014))
  let bodyMesh = meshField(bodyField, bmin, bmax, res.body)
  if (hiders.length) {
    const P = bodyMesh.positions
    const hidden = new Uint8Array(P.length / 3)
    for (let v = 0; v < hidden.length; v++) hidden[v] = covered(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]) ? 1 : 0
    bodyMesh = filterTriangles(bodyMesh, (a, b, c) => !(hidden[a] && hidden[b] && hidden[c]))
  }
  const bodySkin = skinFromPrims(bodyPrims, bodyMesh.positions, boneCount, {
    sigma: 0.026,
    sigmaByBone: { [JOINT_INDEX.spine]: 0.045, [JOINT_INDEX.chest]: 0.04, [JOINT_INDEX.hips]: 0.035, [JOINT_INDEX.neck]: 0.03 },
  })
  const bodyParts: Skinned[] = [{ ...bodyMesh, ...bodySkin, extra: { aHand: { array: new Float32Array(bodyMesh.positions.length / 3), size: 1 } } }]
  ;(['L', 'R'] as const).forEach((side, si) => {
    HAND_SHAPES.forEach((shape, hi) => {
      const sculpt = design.hand(f, side, shape)
      const [hmin, hmax] = boundsOf(sculpt.prims, 0.01)
      const m = meshField(primField(sculpt.prims, 0.03), hmin, hmax, res.head * 1.4)
      const sk = rigidSkin(m.positions.length / 3, JOINT_INDEX[side === 'L' ? 'handL' : 'handR'])
      const zone = skinFromPrims(sculpt.prims, m.positions, boneCount, { rigidBone: 0 }).zone
      bodyParts.push({ ...m, ...sk, zone, extra: { aHand: { array: new Float32Array(m.positions.length / 3).fill(1 + si * 3 + hi), size: 1 } } })
    })
  })
  const body = concatSkinned(bodyParts)

  mark('body')
  // ── Head (head-local, then placed at the head joint) ──────────────────────
  const headBind = f.pos('head')
  const headSculpt = design.head(f)
  const headField = primField(headSculpt.prims, 0.04)
  const headMesh = meshField(headField, design.headBounds[0], design.headBounds[1], res.head)
  const headSkin = skinFromPrims(headSculpt.prims, headMesh.positions, boneCount, { sigma: 0.012 })
  translate(headMesh, headBind)
  const head: Skinned = { ...headMesh, ...headSkin }

  mark('head')
  // ── Hair ─────────────────────────────────────────────────────────────────
  const hairSpec = design.hair(f)
  const clumps = buildHairClumps(hairSpec)
  const hairParts: Skinned[] = []
  const n = clumps.positions.length / 3
  hairParts.push({
    ...clumps,
    ...rigidSkin(n, JOINT_INDEX.head),
    zone: new Float32Array(n).fill(8),
    extra: { aHairT: { array: clumps.hairT, size: 1 }, aStrand: { array: clumps.strand, size: 3 } },
  })
  if (hairSpec.capRegion) {
    const off = hairSpec.capOffset ?? 0.006
    const cap = hairSpec.capRegion.prims
    const capField: Field = {
      sample: (p) => smax(headField.sample(p) - off, evaluate(cap, null, 0, p), 0.006),
      block(c, r) {
        const b = headField.block(c, r)
        return (p) => smax(b(p) - off, evaluate(cap, null, 0, p), 0.006)
      },
    }
    const m = meshField(capField, design.headBounds[0], design.headBounds[1], res.cap)
    const c = m.positions.length / 3
    const hairT = new Float32Array(c)
    const strand = new Float32Array(c * 3)
    // Cap strands run from the crown outward (down the head).
    for (let i = 0; i < c; i++) {
      const x = m.positions[i * 3], y = m.positions[i * 3 + 1], z = m.positions[i * 3 + 2]
      const dx = x - hairSpec.center[0], dy = y - (hairSpec.center[1] + 0.09), dz = z - hairSpec.center[2]
      const l = Math.hypot(dx, dy, dz) || 1
      strand[i * 3] = dx / l
      strand[i * 3 + 1] = dy / l
      strand[i * 3 + 2] = dz / l
      hairT[i] = 0.05
    }
    hairParts.push({ ...m, ...rigidSkin(c, JOINT_INDEX.head), zone: new Float32Array(c).fill(8), extra: { aHairT: { array: hairT, size: 1 }, aStrand: { array: strand, size: 3 } } })
  }
  const hairAll = concatSkinned(hairParts)
  translate(hairAll, headBind)

  mark('hair')
  // ── Armour ───────────────────────────────────────────────────────────────
  const armorParts: Skinned[] = []
  for (const piece of pieces) {
    const solid = piece.offset < 0
    const field: Field = solid ? primField([...piece.region.prims, ...(piece.extra?.prims ?? [])], 0.05) : shellField(bodyField, piece, 2.4 * (res.armor / (piece.detail ?? 1)))
    const [amin, amax] = boundsOf(piece.region.prims, solid ? 0.01 : piece.offset + piece.thickness + 0.012)
    let m = meshField(field, amin, amax, res.armor / (piece.detail ?? 1))
    if (!solid) {
      // Drop the shell's inner face (it lies against the body and is never seen).
      const P = m.positions
      const db = new Float32Array(P.length / 3)
      for (let v = 0; v < db.length; v++) db[v] = bodyField.sample([P[v * 3], P[v * 3 + 1], P[v * 3 + 2]])
      const cut = piece.offset + piece.thickness - Math.max(piece.thickness, 2.4 * (res.armor / (piece.detail ?? 1))) * 0.6
      m = filterTriangles(m, (a, b, c) => Math.max(db[a], db[b], db[c]) > cut)
    }
    if (m.indices.length === 0) continue
    const c = m.positions.length / 3
    const sk = piece.rigid ? rigidSkin(c, JOINT_INDEX[piece.rigid]) : skinFromPrims(bodyPrims, m.positions, boneCount, { sigma: 0.026, sigmaByBone: { [JOINT_INDEX.spine]: 0.045, [JOINT_INDEX.chest]: 0.04 } })
    mark(`armor:${piece.name}`)
    armorParts.push({ ...m, skinIndex: sk.skinIndex, skinWeight: sk.skinWeight, zone: new Float32Array(c).fill(piece.zone) })
  }
  const armor = concatSkinned(armorParts)

  return { body, head, hair: hairAll, armor, headBind, stats: { triangles: (body.indices.length + head.indices.length + hairAll.indices.length + armor.indices.length) / 3, ms: performance.now() - t0 } }
}
