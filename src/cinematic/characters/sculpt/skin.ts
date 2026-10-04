import { Op, primDistance, type Prim, type V3 } from './sdf'

export interface SkinData {
  skinIndex: Uint16Array
  skinWeight: Float32Array
  /** Zone of the nearest additive primitive, per vertex. */
  zone: Float32Array
}

export interface SkinOptions {
  /** Falloff (m) of a bone's influence beyond the nearest bone's surface. Per bone override. */
  sigma?: number
  sigmaByBone?: Readonly<Record<number, number>>
  /** Bones whose influence is spread to a second bone: bone → [other, share 0..1]. */
  share?: Readonly<Record<number, readonly [number, number]>>
  /** Restrict to a single bone (rigid parts). */
  rigidBone?: number
}

/**
 * Skin weights from the sculpt itself: each bone's distance is the nearest of its additive
 * primitives; influence decays exponentially past the nearest bone's distance. Joints therefore
 * blend exactly where the limb volumes meet (elbows, knees, the waist), and a vertex deep inside
 * one bone's volume is rigidly bound to it. Top 4 influences, normalised.
 */
export function skinFromPrims(prims: readonly Prim[], positions: Float32Array, boneCount: number, opts: SkinOptions = {}): SkinData {
  const n = positions.length / 3
  const skinIndex = new Uint16Array(n * 4)
  const skinWeight = new Float32Array(n * 4)
  const zone = new Float32Array(n)
  const sigma = opts.sigma ?? 0.03
  const dist = new Float64Array(boneCount)
  const w = new Float64Array(boneCount)
  const p: [number, number, number] = [0, 0, 0]
  const adds = prims.filter((pr) => pr.op === Op.Union)

  for (let v = 0; v < n; v++) {
    p[0] = positions[v * 3]
    p[1] = positions[v * 3 + 1]
    p[2] = positions[v * 3 + 2]
    if (opts.rigidBone !== undefined) {
      skinIndex[v * 4] = opts.rigidBone
      skinWeight[v * 4] = 1
      zone[v] = nearestZone(adds, p)
      continue
    }
    dist.fill(1e9)
    let best = 1e9
    let bestZone = 0
    for (const pr of adds) {
      const d = primDistance(pr, p)
      if (d < dist[pr.bone]) dist[pr.bone] = d
      if (d < best) {
        best = d
        bestZone = pr.zone
      }
    }
    zone[v] = bestZone
    w.fill(0)
    for (let b = 0; b < boneCount; b++) {
      if (dist[b] > 1e8) continue
      const s = opts.sigmaByBone?.[b] ?? sigma
      w[b] += Math.exp(-Math.max(0, dist[b] - best) / s)
    }
    if (opts.share) {
      for (const [from, [to, share]] of Object.entries(opts.share)) {
        const f = Number(from)
        if (w[f] > 0) {
          w[to] += w[f] * share
          w[f] *= 1 - share
        }
      }
    }
    writeTop4(w, skinIndex, skinWeight, v)
  }
  return { skinIndex, skinWeight, zone }
}

function nearestZone(prims: readonly Prim[], p: V3): number {
  let best = 1e9
  let z = 0
  for (const pr of prims) {
    const d = primDistance(pr, p)
    if (d < best) {
      best = d
      z = pr.zone
    }
  }
  return z
}

function writeTop4(w: Float64Array, idx: Uint16Array, wt: Float32Array, v: number): void {
  const top = [-1, -1, -1, -1]
  for (let b = 0; b < w.length; b++) {
    if (w[b] <= 0) continue
    for (let s = 0; s < 4; s++) {
      if (top[s] < 0 || w[b] > w[top[s]]) {
        for (let t = 3; t > s; t--) top[t] = top[t - 1]
        top[s] = b
        break
      }
    }
  }
  let sum = 0
  for (let s = 0; s < 4; s++) if (top[s] >= 0) sum += w[top[s]]
  for (let s = 0; s < 4; s++) {
    idx[v * 4 + s] = top[s] >= 0 ? top[s] : 0
    wt[v * 4 + s] = top[s] >= 0 && sum > 0 ? w[top[s]] / sum : 0
  }
}

/** Every vertex bound rigidly to one bone. */
export function rigidSkin(count: number, bone: number): Pick<SkinData, 'skinIndex' | 'skinWeight'> {
  const skinIndex = new Uint16Array(count * 4)
  const skinWeight = new Float32Array(count * 4)
  for (let v = 0; v < count; v++) {
    skinIndex[v * 4] = bone
    skinWeight[v * 4] = 1
  }
  return { skinIndex, skinWeight }
}
