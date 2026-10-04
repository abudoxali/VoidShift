import type { MeshData } from './mesher'
import type { Sculpt, V3 } from './sdf'

/**
 * Stylised hair: a scalp cap (the head surface pushed out and cut at the hairline) plus layered
 * clumps. Each clump is a tapered, flattened blade swept along a Catmull-Rom curve, with its flat
 * side kept against the head so the layers stack like painted locks. Per-vertex strand data
 * (`hairT` root→tip and the strand tangent) drives the gradient, the anisotropic highlight and
 * the tip motion in the shader.
 */
export interface HairClump {
  /** Curve points in head-local space, root first. */
  points: V3[]
  /** Half width / half thickness at the root (m). */
  width: number
  thickness: number
  /** Where along the clump it is widest (0..1). */
  belly?: number
  /** Twist of the blade about the curve over its length (radians). */
  twist?: number
  /** Normal reference: the blade's flat side faces away from this point (default head centre). */
  center?: V3
}

export interface HairSpec {
  clumps: HairClump[]
  /** Hairline region (head-local) that cuts the scalp cap; omit for no cap. */
  capRegion?: Sculpt
  /** Cap offset from the head surface (m). */
  capOffset?: number
  /** Head centre used to orient blades. */
  center: V3
}

export interface HairMesh extends MeshData {
  hairT: Float32Array
  strand: Float32Array
}

type Vec = [number, number, number]

const sub = (a: V3, b: V3): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: V3, b: V3): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3): Vec => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

function catmull(pts: readonly V3[], t: number): Vec {
  const n = pts.length - 1
  const f = Math.min(t * n, n - 1e-6)
  const i = Math.floor(f)
  const u = f - i
  const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, n)]
  const out: Vec = [0, 0, 0]
  for (let k = 0; k < 3; k++) {
    const a = 2 * p1[k]
    const b = p2[k] - p0[k]
    const c = 2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]
    const d = -p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]
    out[k] = 0.5 * (a + b * u + c * u * u + d * u * u * u)
  }
  return out
}

/** Blade cross-section: a lens with a raised ridge on the outer face (anime lock silhouette). */
const SECTION = (() => {
  const s: [number, number][] = []
  const n = 10
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const c = Math.cos(a), sn = Math.sin(a)
    // Sharp side edges (|cos|^0.55 keeps them pointed), fuller outer face than inner face.
    const x = Math.sign(c) * Math.pow(Math.abs(c), 0.75)
    const y = sn > 0 ? Math.pow(sn, 0.8) : sn * 0.55
    s.push([x, y])
  }
  return s
})()

export function buildHairClumps(spec: HairSpec, segments = 14): HairMesh {
  const pos: number[] = []
  const nor: number[] = []
  const hairT: number[] = []
  const strand: number[] = []
  const idx: number[] = []
  const ring = SECTION.length

  for (const clump of spec.clumps) {
    const base = pos.length / 3
    const center = clump.center ?? spec.center
    const belly = clump.belly ?? 0.3
    for (let s = 0; s <= segments; s++) {
      const t = s / segments
      const p = catmull(clump.points, t)
      const pa = catmull(clump.points, Math.max(0, t - 0.01))
      const pb = catmull(clump.points, Math.min(1, t + 0.01))
      const tan = norm(sub(pb, pa))
      // Outward reference: away from the head centre, made perpendicular to the tangent.
      const out = norm(sub(p, center))
      let side = norm(cross(tan, out))
      let up = norm(cross(side, tan))
      const tw = (clump.twist ?? 0) * t
      if (tw !== 0) {
        const c = Math.cos(tw), sn = Math.sin(tw)
        const ns: Vec = [side[0] * c + up[0] * sn, side[1] * c + up[1] * sn, side[2] * c + up[2] * sn]
        const nu: Vec = [up[0] * c - side[0] * sn, up[1] * c - side[1] * sn, up[2] * c - side[2] * sn]
        side = ns
        up = nu
      }
      // Width profile: swells to the belly, then tapers to a sharp tip.
      const swell = t < belly ? 0.75 + 0.25 * Math.sin((t / belly) * Math.PI * 0.5) : 1
      const taper = Math.pow(Math.max(0, 1 - t), 0.85)
      const w = clump.width * swell * taper
      const h = clump.thickness * swell * Math.pow(Math.max(0, 1 - t), 0.6)
      for (let r = 0; r < ring; r++) {
        const [sx, sy] = SECTION[r]
        pos.push(p[0] + side[0] * sx * w + up[0] * sy * h, p[1] + side[1] * sx * w + up[1] * sy * h, p[2] + side[2] * sx * w + up[2] * sy * h)
        // Normal of the ellipse section (approximate), biased outward so the blade reads as a lock.
        const nx = sx / Math.max(w, 1e-4) * clump.width
        const ny = sy / Math.max(h, 1e-4) * clump.thickness * 0.6
        const n = norm([side[0] * nx + up[0] * ny, side[1] * nx + up[1] * ny, side[2] * nx + up[2] * ny])
        nor.push(n[0], n[1], n[2])
        hairT.push(t)
        strand.push(tan[0], tan[1], tan[2])
      }
    }
    for (let s = 0; s < segments; s++)
      for (let r = 0; r < ring; r++) {
        const a = base + s * ring + r
        const b = base + s * ring + ((r + 1) % ring)
        const c = a + ring
        const d = b + ring
        idx.push(a, c, b, b, c, d)
      }
    // Root cap.
    for (let r = 1; r < ring - 1; r++) idx.push(base, base + r + 1, base + r)
  }
  return {
    positions: new Float32Array(pos),
    normals: new Float32Array(nor),
    indices: new Uint32Array(idx),
    hairT: new Float32Array(hairT),
    strand: new Float32Array(strand),
  }
}

/** Convenience: a clump from a root, an initial direction and a sweep (all head-local). */
export function lock(root: V3, sweep: V3[], width: number, thickness: number, opts: Partial<HairClump> = {}): HairClump {
  const pts: V3[] = [root]
  let cur: V3 = root
  for (const d of sweep) {
    cur = [cur[0] + d[0], cur[1] + d[1], cur[2] + d[2]]
    pts.push(cur)
  }
  return { points: pts, width, thickness, ...opts }
}
