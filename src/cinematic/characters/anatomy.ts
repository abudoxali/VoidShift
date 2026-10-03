import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Procedural anatomy toolkit. Body parts are LOFTS: a stack of superellipse cross-sections
 * along +Y. Each ring sets its height, half-widths (x: side, z: depth), a centre offset (to push
 * the chest forward, the jaw back…) and an exponent `n` — 2 is an ellipse, larger values give the
 * flatter planes of a face, a ribcage or an armour plate. Normals are smooth, so bodies read as
 * sculpted forms rather than faceted placeholders.
 */
export interface Ring {
  y: number
  rx: number
  rz: number
  /** Centre offset. */
  x?: number
  z?: number
  /** Superellipse exponent (2 = ellipse). */
  n?: number
  /** Extra forward bulge applied only to the front half (pecs, knees, a nose bridge…). */
  front?: number
}

export interface LoftOptions {
  segments?: number
  /** Close the ends with a rounded cap of this height (0 = flat cap). */
  capBottom?: number
  capTop?: number
}

const TAU = Math.PI * 2

function ringPoint(r: Ring, theta: number, out: Vector3): Vector3 {
  // theta = 0 → +X (character's left), π/2 → +Z (front).
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  const n = r.n ?? 2
  const e = 2 / n
  const px = r.rx * Math.sign(c) * Math.pow(Math.abs(c), e)
  let pz = r.rz * Math.sign(s) * Math.pow(Math.abs(s), e)
  if (r.front && s > 0) pz += r.front * Math.pow(s, 3)
  return out.set((r.x ?? 0) + px, r.y, (r.z ?? 0) + pz)
}

/** Builds a smooth closed loft through the rings (bottom → top). */
export function loft(rings: Ring[], options: LoftOptions = {}): BufferGeometry {
  const seg = options.segments ?? 20
  const positions: number[] = []
  const indices: number[] = []
  const p = new Vector3()
  for (const r of rings) {
    for (let i = 0; i < seg; i++) {
      ringPoint(r, (i / seg) * TAU, p)
      positions.push(p.x, p.y, p.z)
    }
  }
  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * seg + i
      const b = j * seg + ((i + 1) % seg)
      const c = (j + 1) * seg + i
      const d = (j + 1) * seg + ((i + 1) % seg)
      indices.push(a, c, b, b, c, d)
    }
  }
  const cap = (ringIndex: number, height: number, top: boolean) => {
    const r = rings[ringIndex]
    const center = positions.length / 3
    positions.push(r.x ?? 0, r.y + (top ? height : -height), r.z ?? 0)
    for (let i = 0; i < seg; i++) {
      const a = ringIndex * seg + i
      const b = ringIndex * seg + ((i + 1) % seg)
      if (top) indices.push(a, b, center)
      else indices.push(b, a, center)
    }
  }
  cap(0, options.capBottom ?? 0, false)
  cap(rings.length - 1, options.capTop ?? 0, true)
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

/**
 * A limb segment hanging from its joint along -Y: rounded shoulder/hip end, a muscle belly at
 * `belly` (0..1 along the length), tapering to the next joint. Overlaps the joint ends slightly so
 * consecutive segments read as one continuous limb.
 */
export function limbSegment(length: number, rTop: number, rBelly: number, rBottom: number, options: { belly?: number; depth?: number; frontBias?: number; segments?: number } = {}): BufferGeometry {
  const b = options.belly ?? 0.3
  const d = options.depth ?? 0.92
  const fb = options.frontBias ?? 0
  const rings: Ring[] = [
    { y: -length - rBottom * 0.55, rx: rBottom * 0.55, rz: rBottom * 0.55 * d },
    { y: -length, rx: rBottom, rz: rBottom * d },
    { y: -length * (1 - (1 - b) * 0.5), rx: (rBottom + rBelly) * 0.52, rz: (rBottom + rBelly) * 0.52 * d, front: fb * 0.5 },
    { y: -length * b, rx: rBelly, rz: rBelly * d, front: fb },
    { y: -length * b * 0.35, rx: (rTop + rBelly) * 0.5, rz: (rTop + rBelly) * 0.5 * d },
    { y: 0, rx: rTop, rz: rTop * d },
    { y: rTop * 0.5, rx: rTop * 0.6, rz: rTop * 0.6 * d },
  ]
  return loft(rings, { segments: options.segments ?? 16, capBottom: rBottom * 0.2, capTop: rTop * 0.25 })
}

/** Rotate (radians, XYZ order), scale and translate a geometry in place. */
export function xform(g: BufferGeometry, t: { x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; s?: number | [number, number, number] }): BufferGeometry {
  const s = t.s ?? 1
  const [sx, sy, sz] = Array.isArray(s) ? s : [s, s, s]
  g.scale(sx, sy, sz)
  if (t.rx) g.rotateX(t.rx)
  if (t.ry) g.rotateY(t.ry)
  if (t.rz) g.rotateZ(t.rz)
  g.translate(t.x ?? 0, t.y ?? 0, t.z ?? 0)
  return g
}

/** Merge several geometries authored in the same space (all must share attribute layout). */
export function merge(parts: BufferGeometry[]): BufferGeometry {
  const normalized = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p
    const out = new BufferGeometry()
    out.setAttribute('position', g.getAttribute('position'))
    out.setAttribute('normal', g.getAttribute('normal'))
    return out
  })
  const merged = mergeGeometries(normalized, false)
  if (!merged) throw new Error('anatomy.merge: incompatible geometries')
  return merged
}

/** A thin tapered plate (armour panels, hair plates, cloak shards): a flattened loft. */
export function plate(length: number, width: number, thickness: number, options: { taper?: number; tipTaper?: number; n?: number } = {}): BufferGeometry {
  const taper = options.taper ?? 0.85
  const tip = options.tipTaper ?? 0.15
  const n = options.n ?? 3
  return loft(
    [
      { y: 0, rx: width * 0.5 * taper, rz: thickness * 0.5, n },
      { y: length * 0.35, rx: width * 0.5, rz: thickness * 0.5, n },
      { y: length * 0.8, rx: width * 0.5 * 0.7, rz: thickness * 0.45, n },
      { y: length, rx: width * 0.5 * tip, rz: thickness * 0.3, n },
    ],
    { segments: 12, capBottom: 0, capTop: thickness * 0.3 },
  )
}

export { TAU }
