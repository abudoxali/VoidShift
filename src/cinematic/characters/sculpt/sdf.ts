/**
 * Signed-distance sculpting kernel for the fighters' meshes.
 *
 * A character is authored as an ordered list of primitives (ellipsoids, round cones, rounded
 * boxes…) combined with smooth unions / subtractions. Every primitive carries the skeleton bone
 * it belongs to (for skin weights) and a zone id (for painting). The field is evaluated by the
 * surface-nets mesher (`mesher.ts`). Pure TypeScript with plain numbers: no three.js objects in
 * the hot path, so it runs equally in the browser and in tests.
 */

export type V3 = readonly [number, number, number]

export const enum Shape {
  Sphere = 0,
  Ellipsoid = 1,
  RoundCone = 2,
  Box = 3,
  /** A flattened capsule: round cone whose cross-section is squashed along a side axis. */
  FlatCone = 4,
  Torus = 5,
}

export const enum Op {
  Union = 0,
  Subtract = 1,
  /** Intersect with everything accumulated so far (use inside dedicated shells only). */
  Intersect = 2,
}

export interface Prim {
  shape: Shape
  op: Op
  /** Smooth blend radius (m). */
  k: number
  bone: number
  zone: number
  /** Centre (sphere/ellipsoid/box/torus) or segment start (cones). */
  a: V3
  /** Segment end (cones). */
  b: V3
  /** Radii: ellipsoid (rx, ry, rz), cone (r1, r2, squash), box half extents, torus (R, r, _). */
  r: V3
  /** Rounding for boxes. */
  round: number
  /** Optional world→local rotation (row-major 3×3) for ellipsoids, boxes, tori. */
  rot: number[] | null
  /** Bounding sphere (for block culling). */
  bc: V3
  br: number
}

const IDENT = [1, 0, 0, 0, 1, 0, 0, 0, 1]

/** Rotation matrix (row-major, world→local) from Euler angles in radians (XYZ, local = R^T world). */
export function rotation(rx: number, ry: number, rz: number): number[] {
  const cx = Math.cos(rx), sx = Math.sin(rx)
  const cy = Math.cos(ry), sy = Math.sin(ry)
  const cz = Math.cos(rz), sz = Math.sin(rz)
  // R = Rz * Ry * Rx (local→world), stored transposed (world→local).
  const m00 = cz * cy, m01 = cz * sy * sx - sz * cx, m02 = cz * sy * cx + sz * sx
  const m10 = sz * cy, m11 = sz * sy * sx + cz * cx, m12 = sz * sy * cx - cz * sx
  const m20 = -sy, m21 = cy * sx, m22 = cy * cx
  return [m00, m10, m20, m01, m11, m21, m02, m12, m22]
}

/** World→local rotation that maps the local +Y axis onto `dir` (twist `roll` about it). */
export function alignY(dir: V3, roll = 0): number[] {
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1
  const y = [dir[0] / l, dir[1] / l, dir[2] / l]
  const ref = Math.abs(y[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
  // x = normalize(y × ref), z = x × y
  let x = [y[1] * ref[2] - y[2] * ref[1], y[2] * ref[0] - y[0] * ref[2], y[0] * ref[1] - y[1] * ref[0]]
  const xl = Math.hypot(x[0], x[1], x[2])
  x = [x[0] / xl, x[1] / xl, x[2] / xl]
  let z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]
  if (roll !== 0) {
    const c = Math.cos(roll), s = Math.sin(roll)
    const nx = [x[0] * c + z[0] * s, x[1] * c + z[1] * s, x[2] * c + z[2] * s]
    const nz = [z[0] * c - x[0] * s, z[1] * c - x[1] * s, z[2] * c - x[2] * s]
    x = nx
    z = nz
  }
  return [x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]]
}

interface PrimOptions {
  k?: number
  op?: Op
  zone?: number
  rot?: number[] | null
  round?: number
}

function boundOf(shape: Shape, a: V3, b: V3, r: V3, round: number): { bc: V3; br: number } {
  switch (shape) {
    case Shape.Sphere:
      return { bc: a, br: r[0] }
    case Shape.Ellipsoid:
      return { bc: a, br: Math.max(r[0], r[1], r[2]) }
    case Shape.Box:
      return { bc: a, br: Math.hypot(r[0], r[1], r[2]) + round }
    case Shape.Torus:
      return { bc: a, br: r[0] + r[1] }
    default: {
      const c: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
      const h = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2
      return { bc: c, br: h + Math.max(r[0], r[1]) }
    }
  }
}

/** Builder for an ordered primitive list. Every call appends one primitive on the current bone. */
export class Sculpt {
  readonly prims: Prim[] = []
  bone = 0
  zone = 0
  /** Default smooth blend radius for unions. */
  k = 0.02

  on(bone: number, zone = this.zone): this {
    this.bone = bone
    this.zone = zone
    return this
  }

  private push(shape: Shape, a: V3, b: V3, r: V3, o: PrimOptions = {}): this {
    const round = o.round ?? 0
    const { bc, br } = boundOf(shape, a, b, r, round)
    this.prims.push({ shape, op: o.op ?? Op.Union, k: o.k ?? this.k, bone: this.bone, zone: o.zone ?? this.zone, a, b, r, round, rot: o.rot ?? null, bc, br })
    return this
  }

  sphere(c: V3, radius: number, o?: PrimOptions): this {
    return this.push(Shape.Sphere, c, c, [radius, radius, radius], o)
  }
  ellipsoid(c: V3, r: V3, o?: PrimOptions): this {
    return this.push(Shape.Ellipsoid, c, c, r, o)
  }
  /** Round cone (capsule with different end radii). */
  cone(a: V3, b: V3, r1: number, r2: number, o?: PrimOptions): this {
    return this.push(Shape.RoundCone, a, b, [r1, r2, 1], o)
  }
  /** Round cone with a squashed cross-section: `squash` < 1 flattens along the frame's X (from `rot`). */
  flatCone(a: V3, b: V3, r1: number, r2: number, squash: number, o?: PrimOptions): this {
    return this.push(Shape.FlatCone, a, b, [r1, r2, squash], { ...o, rot: o?.rot ?? alignY([b[0] - a[0], b[1] - a[1], b[2] - a[2]]) })
  }
  box(c: V3, half: V3, o?: PrimOptions): this {
    return this.push(Shape.Box, c, c, half, o)
  }
  torus(c: V3, R: number, r: number, o?: PrimOptions): this {
    return this.push(Shape.Torus, c, c, [R, r, 0], o)
  }
}

// ── Evaluation ──────────────────────────────────────────────────────────────

/** Polynomial smooth minimum (iq). */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return a < b ? a : b
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

export function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k)
}

const L = [0, 0, 0]

function toLocal(p: V3, c: V3, rot: number[] | null): number[] {
  const x = p[0] - c[0], y = p[1] - c[1], z = p[2] - c[2]
  const m = rot ?? IDENT
  L[0] = m[0] * x + m[1] * y + m[2] * z
  L[1] = m[3] * x + m[4] * y + m[5] * z
  L[2] = m[6] * x + m[7] * y + m[8] * z
  return L
}

/** Distance from p to one primitive. */
export function primDistance(pr: Prim, p: V3): number {
  switch (pr.shape) {
    case Shape.Sphere:
      return Math.hypot(p[0] - pr.a[0], p[1] - pr.a[1], p[2] - pr.a[2]) - pr.r[0]
    case Shape.Ellipsoid: {
      const q = toLocal(p, pr.a, pr.rot)
      const k0 = Math.hypot(q[0] / pr.r[0], q[1] / pr.r[1], q[2] / pr.r[2])
      const k1 = Math.hypot(q[0] / (pr.r[0] * pr.r[0]), q[1] / (pr.r[1] * pr.r[1]), q[2] / (pr.r[2] * pr.r[2]))
      return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(pr.r[0], pr.r[1], pr.r[2])
    }
    case Shape.Box: {
      const q = toLocal(p, pr.a, pr.rot)
      const rd = pr.round
      const qx = Math.abs(q[0]) - pr.r[0] + rd, qy = Math.abs(q[1]) - pr.r[1] + rd, qz = Math.abs(q[2]) - pr.r[2] + rd
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0)
      return Math.hypot(ox, oy, oz) + Math.min(Math.max(qx, qy, qz), 0) - rd
    }
    case Shape.Torus: {
      const q = toLocal(p, pr.a, pr.rot)
      const qx = Math.hypot(q[0], q[2]) - pr.r[0]
      return Math.hypot(qx, q[1]) - pr.r[1]
    }
    case Shape.RoundCone:
      return roundCone(p, pr.a, pr.b, pr.r[0], pr.r[1], 1, null)
    case Shape.FlatCone:
      return roundCone(p, pr.a, pr.b, pr.r[0], pr.r[1], pr.r[2], pr.rot)
  }
}

/** Round cone between a and b (iq), with an optional cross-section squash along the local X. */
function roundCone(p: V3, a: V3, b: V3, r1: number, r2: number, squash: number, rot: number[] | null): number {
  let px = p[0] - a[0], py = p[1] - a[1], pz = p[2] - a[2]
  let bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2]
  if (rot && squash !== 1) {
    // Work in the cone's frame and stretch X so the circle becomes an ellipse.
    const m = rot
    const lx = m[0] * px + m[1] * py + m[2] * pz
    const ly = m[3] * px + m[4] * py + m[5] * pz
    const lz = m[6] * px + m[7] * py + m[8] * pz
    px = lx / squash
    py = ly
    pz = lz
    const len = Math.hypot(bx, by, bz)
    bx = 0
    by = len
    bz = 0
  }
  const l2 = bx * bx + by * by + bz * bz
  const rr = r1 - r2
  const a2 = l2 - rr * rr
  const il2 = 1 / l2
  const y = px * bx + py * by + pz * bz
  const z = y - l2
  const wx = px * l2 - bx * y, wy = py * l2 - by * y, wz = pz * l2 - bz * y
  const x2 = wx * wx + wy * wy + wz * wz
  const y2 = y * y * l2
  const z2 = z * z * l2
  const k = Math.sign(rr) * rr * rr * x2
  let d: number
  if (Math.sign(z) * a2 * z2 > k) d = Math.sqrt(x2 + z2) * il2 - r2
  else if (Math.sign(y) * a2 * y2 < k) d = Math.sqrt(x2 + y2) * il2 - r1
  else d = (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1
  return squash !== 1 ? d * Math.min(1, squash) : d
}

/**
 * Evaluates the combined field of `prims` (indices into `all`) at p. Primitives are applied in
 * order: union (smooth), subtract (smooth), intersect (smooth).
 */
export function evaluate(all: readonly Prim[], idx: ArrayLike<number> | null, count: number, p: V3): number {
  let d = 1e9
  const n = idx ? count : all.length
  for (let i = 0; i < n; i++) {
    const pr = all[idx ? idx[i] : i]
    const e = primDistance(pr, p)
    if (pr.op === Op.Union) d = smin(d, e, pr.k)
    else if (pr.op === Op.Subtract) d = smax(d, -e, pr.k)
    else d = smax(d, e, pr.k)
  }
  return d
}

/** Field interface consumed by the mesher. */
export interface Field {
  /** Distance at p using every primitive. */
  sample(p: V3): number
  /** Prepare a cull list for an axis-aligned block (centre, half-diagonal). Returns a block evaluator. */
  block(c: V3, radius: number): (p: V3) => number
}

/**
 * Wraps a primitive list as a Field with block culling. Unions/subtractions farther than
 * `reach` from a block cannot change the surface inside it; intersections are always kept.
 */
export function primField(prims: readonly Prim[], reach = 0.08): Field {
  const scratch = new Int32Array(prims.length)
  return {
    sample: (p) => evaluate(prims, null, 0, p),
    block(c, radius) {
      let n = 0
      for (let i = 0; i < prims.length; i++) {
        const pr = prims[i]
        const dist = Math.hypot(c[0] - pr.bc[0], c[1] - pr.bc[1], c[2] - pr.bc[2]) - pr.br - radius
        if (pr.op === Op.Intersect || dist < reach + pr.k) scratch[n++] = i
      }
      const list = scratch.slice(0, n)
      return (p) => evaluate(prims, list, n, p)
    },
  }
}

/** Field from an arbitrary function (no culling). */
export function fnField(fn: (p: V3) => number): Field {
  return { sample: fn, block: () => fn }
}
