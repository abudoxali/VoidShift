import type { Field, V3 } from './sdf'

/** Indexed triangle mesh with smooth normals taken from the field's gradient. */
export interface MeshData {
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
}

export interface MeshOptions {
  /** Cells per culling block edge. */
  block?: number
  /** Newton projections of each vertex onto the zero level set. */
  project?: number
}

const CORNERS: readonly V3[] = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
]
// The 12 cube edges as corner pairs.
const EDGES: readonly [number, number][] = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
]

/**
 * Surface nets over the box [min, max] at `cell` resolution. The field is first sampled on a
 * coarse block lattice; blocks whose corners are all farther from the surface than the block's
 * diagonal are skipped (the surface cannot cross them), so only a narrow band is evaluated at
 * full resolution. Vertices are projected onto the surface and get gradient normals, which keeps
 * shading smooth even where the lattice is coarse.
 */
export function meshField(field: Field, min: V3, max: V3, cell: number, opts: MeshOptions = {}): MeshData {
  const B = opts.block ?? 4
  const project = opts.project ?? 1
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1
  const ny = Math.ceil((max[1] - min[1]) / cell) + 1
  const nz = Math.ceil((max[2] - min[2]) / cell) + 1
  const bx = Math.ceil((nx - 1) / B), by = Math.ceil((ny - 1) / B), bz = Math.ceil((nz - 1) / B)
  const at = (i: number, j: number, k: number) => i + nx * (j + ny * k)
  const values = new Float32Array(nx * ny * nz).fill(Number.NaN)
  const p: [number, number, number] = [0, 0, 0]
  const pos = (i: number, j: number, k: number) => {
    p[0] = min[0] + i * cell
    p[1] = min[1] + j * cell
    p[2] = min[2] + k * cell
    return p
  }

  // Coarse lattice at block corners.
  const cx = bx + 1, cy = by + 1, cz = bz + 1
  const coarse = new Float32Array(cx * cy * cz)
  const cidx = (i: number, j: number, k: number) => i + cx * (j + cy * k)
  for (let k = 0; k < cz; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++) coarse[cidx(i, j, k)] = field.sample(pos(Math.min(i * B, nx - 1), Math.min(j * B, ny - 1), Math.min(k * B, nz - 1)))

  const diag = Math.sqrt(3) * B * cell
  const active = new Uint8Array(bx * by * bz)
  const evaluators: ((q: V3) => number)[] = new Array(bx * by * bz)
  const bidx = (i: number, j: number, k: number) => i + bx * (j + by * k)

  for (let k = 0; k < bz; k++)
    for (let j = 0; j < by; j++)
      for (let i = 0; i < bx; i++) {
        let mn = Infinity
        let pos0 = false
        let neg0 = false
        for (const c of CORNERS) {
          const v = coarse[cidx(i + c[0], j + c[1], k + c[2])]
          mn = Math.min(mn, Math.abs(v))
          if (v < 0) neg0 = true
          else pos0 = true
        }
        // Margin 1.5×: the sculpt field is only approximately Lipschitz-1.
        if (pos0 && neg0) active[bidx(i, j, k)] = 1
        else if (mn < diag * 1.5) active[bidx(i, j, k)] = 1
      }

  // Exact values in active blocks.
  for (let k = 0; k < bz; k++)
    for (let j = 0; j < by; j++)
      for (let i = 0; i < bx; i++) {
        if (!active[bidx(i, j, k)]) continue
        const i0 = i * B, j0 = j * B, k0 = k * B
        const i1 = Math.min(i0 + B, nx - 1), j1 = Math.min(j0 + B, ny - 1), k1 = Math.min(k0 + B, nz - 1)
        const centre: V3 = [min[0] + ((i0 + i1) / 2) * cell, min[1] + ((j0 + j1) / 2) * cell, min[2] + ((k0 + k1) / 2) * cell]
        const ev = field.block(centre, diag * 0.5 + cell)
        evaluators[bidx(i, j, k)] = ev
        for (let kk = k0; kk <= k1; kk++)
          for (let jj = j0; jj <= j1; jj++)
            for (let ii = i0; ii <= i1; ii++) {
              const id = at(ii, jj, kk)
              if (Number.isNaN(values[id])) values[id] = ev(pos(ii, jj, kk))
            }
      }

  // Remaining points: interpolate the coarse lattice (only their sign matters).
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const id = at(i, j, k)
        if (!Number.isNaN(values[id])) continue
        const fi = Math.min(i / B, bx - 1e-6), fj = Math.min(j / B, by - 1e-6), fk = Math.min(k / B, bz - 1e-6)
        const i0 = Math.floor(fi), j0 = Math.floor(fj), k0 = Math.floor(fk)
        const tx = fi - i0, ty = fj - j0, tz = fk - k0
        let v = 0
        for (const c of CORNERS) {
          const w = (c[0] ? tx : 1 - tx) * (c[1] ? ty : 1 - ty) * (c[2] ? tz : 1 - tz)
          v += w * coarse[cidx(i0 + c[0], j0 + c[1], k0 + c[2])]
        }
        values[id] = v
      }

  // One vertex per crossing cell.
  const ncx = nx - 1, ncy = ny - 1, ncz = nz - 1
  const cellVertex = new Int32Array(ncx * ncy * ncz).fill(-1)
  const cellAt = (i: number, j: number, k: number) => i + ncx * (j + ncy * k)
  const verts: number[] = []
  const norms: number[] = []
  const crossing: number[] = []
  const corner = new Float32Array(8)
  const q: [number, number, number] = [0, 0, 0]
  const grad: [number, number, number] = [0, 0, 0]
  const e = cell * 0.25
  const gradient = (ev: (x: V3) => number, x: number, y: number, z: number) => {
    q[0] = x + e; q[1] = y; q[2] = z
    const dx1 = ev(q); q[0] = x - e
    const dx0 = ev(q); q[0] = x; q[1] = y + e
    const dy1 = ev(q); q[1] = y - e
    const dy0 = ev(q); q[1] = y; q[2] = z + e
    const dz1 = ev(q); q[2] = z - e
    const dz0 = ev(q)
    grad[0] = dx1 - dx0
    grad[1] = dy1 - dy0
    grad[2] = dz1 - dz0
    const l = Math.hypot(grad[0], grad[1], grad[2]) || 1
    grad[0] /= l
    grad[1] /= l
    grad[2] /= l
    return grad
  }

  for (let k = 0; k < ncz; k++)
    for (let j = 0; j < ncy; j++)
      for (let i = 0; i < ncx; i++) {
        const blk = bidx(Math.min(Math.floor(i / B), bx - 1), Math.min(Math.floor(j / B), by - 1), Math.min(Math.floor(k / B), bz - 1))
        if (!active[blk]) continue
        let mask = 0
        for (let c = 0; c < 8; c++) {
          const v = values[at(i + CORNERS[c][0], j + CORNERS[c][1], k + CORNERS[c][2])]
          corner[c] = v
          if (v < 0) mask |= 1 << c
        }
        if (mask === 0 || mask === 255) continue
        let sx = 0, sy = 0, sz = 0, n = 0
        for (const [a, b] of EDGES) {
          const va = corner[a], vb = corner[b]
          if (va < 0 === vb < 0) continue
          const t = va / (va - vb)
          sx += CORNERS[a][0] + (CORNERS[b][0] - CORNERS[a][0]) * t
          sy += CORNERS[a][1] + (CORNERS[b][1] - CORNERS[a][1]) * t
          sz += CORNERS[a][2] + (CORNERS[b][2] - CORNERS[a][2]) * t
          n++
        }
        let x = min[0] + (i + sx / n) * cell
        let y = min[1] + (j + sy / n) * cell
        let z = min[2] + (k + sz / n) * cell
        const ev = evaluators[blk] ?? field.sample
        for (let it = 0; it < project; it++) {
          q[0] = x; q[1] = y; q[2] = z
          const d = ev(q)
          const g = gradient(ev, x, y, z)
          // Never let the projection leave the cell's neighbourhood (thin features).
          const step = Math.max(-cell, Math.min(cell, d))
          x -= g[0] * step
          y -= g[1] * step
          z -= g[2] * step
        }
        const g = gradient(ev, x, y, z)
        cellVertex[cellAt(i, j, k)] = verts.length / 3
        verts.push(x, y, z)
        norms.push(g[0], g[1], g[2])
        crossing.push(i, j, k)
      }

  // Quads across every sign-changing lattice edge.
  const tris: number[] = []
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return
    // Split along the shorter diagonal.
    const dac = dist2(verts, a, c), dbd = dist2(verts, b, d)
    if (dac <= dbd) {
      if (flip) tris.push(a, c, b, a, d, c)
      else tris.push(a, b, c, a, c, d)
    } else if (flip) tris.push(a, d, b, b, d, c)
    else tris.push(a, b, d, b, c, d)
  }
  for (let v = 0; v < crossing.length; v += 3) {
    const i = crossing[v], j = crossing[v + 1], k = crossing[v + 2]
    const v0 = values[at(i, j, k)]
    const inside = v0 < 0
    // Edge along +X from the cell's min corner: shared by cells (i, j-1..j, k-1..k).
    if (j > 0 && k > 0 && inside !== values[at(i + 1, j, k)] < 0)
      quad(cellVertex[cellAt(i, j - 1, k - 1)], cellVertex[cellAt(i, j, k - 1)], cellVertex[cellAt(i, j, k)], cellVertex[cellAt(i, j - 1, k)], !inside)
    if (i > 0 && k > 0 && inside !== values[at(i, j + 1, k)] < 0)
      quad(cellVertex[cellAt(i - 1, j, k - 1)], cellVertex[cellAt(i - 1, j, k)], cellVertex[cellAt(i, j, k)], cellVertex[cellAt(i, j, k - 1)], !inside)
    if (i > 0 && j > 0 && inside !== values[at(i, j, k + 1)] < 0)
      quad(cellVertex[cellAt(i - 1, j - 1, k)], cellVertex[cellAt(i, j - 1, k)], cellVertex[cellAt(i, j, k)], cellVertex[cellAt(i - 1, j, k)], !inside)
  }

  return { positions: new Float32Array(verts), normals: new Float32Array(norms), indices: new Uint32Array(tris) }
}

function dist2(v: number[], a: number, b: number): number {
  const dx = v[a * 3] - v[b * 3], dy = v[a * 3 + 1] - v[b * 3 + 1], dz = v[a * 3 + 2] - v[b * 3 + 2]
  return dx * dx + dy * dy + dz * dz
}

/** Appends meshes into one (indices rebased). */
export function concatMeshes(parts: readonly MeshData[]): MeshData {
  let nv = 0, ni = 0
  for (const m of parts) {
    nv += m.positions.length
    ni += m.indices.length
  }
  const positions = new Float32Array(nv), normals = new Float32Array(nv), indices = new Uint32Array(ni)
  let ov = 0, oi = 0
  for (const m of parts) {
    positions.set(m.positions, ov)
    normals.set(m.normals, ov)
    const base = ov / 3
    for (let i = 0; i < m.indices.length; i++) indices[oi + i] = m.indices[i] + base
    ov += m.positions.length
    oi += m.indices.length
  }
  return { positions, normals, indices }
}

/**
 * Keeps the triangles for which `keep(a, b, c)` holds and compacts the vertices. Used to drop
 * hidden surfaces (the inside face of armour shells, skin under a covering layer).
 */
export function filterTriangles(m: MeshData, keep: (a: number, b: number, c: number) => boolean): MeshData {
  const remap = new Int32Array(m.positions.length / 3).fill(-1)
  const tris: number[] = []
  let next = 0
  for (let i = 0; i < m.indices.length; i += 3) {
    const a = m.indices[i], b = m.indices[i + 1], c = m.indices[i + 2]
    if (!keep(a, b, c)) continue
    for (const v of [a, b, c]) {
      if (remap[v] < 0) remap[v] = next++
      tris.push(remap[v])
    }
  }
  const positions = new Float32Array(next * 3), normals = new Float32Array(next * 3)
  for (let v = 0; v < remap.length; v++) {
    const r = remap[v]
    if (r < 0) continue
    positions.set(m.positions.subarray(v * 3, v * 3 + 3), r * 3)
    normals.set(m.normals.subarray(v * 3, v * 3 + 3), r * 3)
  }
  return { positions, normals, indices: new Uint32Array(tris) }
}
