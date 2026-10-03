/**
 * Signed distance field generation (Felzenszwalb & Huttenlocher exact Euclidean distance
 * transform). Used to build the glyph atlas at runtime from a rasterised font, so world-space
 * typography stays crisp at any scale/angle without shipping a pre-baked MSDF font.
 */

const INF = 1e20

function edt1d(f: Float64Array, d: Float64Array, v: Int32Array, z: Float64Array, n: number): void {
  v[0] = 0
  z[0] = -INF
  z[1] = INF
  for (let q = 1, k = 0; q < n; q++) {
    let s: number
    do {
      const r = v[k]
      s = (f[q] - f[r] + q * q - r * r) / (q - r) / 2
    } while (s <= z[k] && --k > -1)
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = INF
  }
  for (let q = 0, k = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    const r = v[k]
    d[q] = (q - r) * (q - r) + f[r]
  }
}

/** In-place 2D squared distance transform of `grid` (0 = feature, INF = background). */
export function edt2d(grid: Float64Array, width: number, height: number): void {
  const n = Math.max(width, height)
  const f = new Float64Array(n)
  const d = new Float64Array(n)
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = grid[y * width + x]
    edt1d(f, d, v, z, height)
    for (let y = 0; y < height; y++) grid[y * width + x] = d[y]
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = grid[y * width + x]
    edt1d(f, d, v, z, width)
    for (let x = 0; x < width; x++) grid[y * width + x] = d[x]
  }
}

/**
 * Converts a coverage mask (0..255) to an 8-bit SDF where 128 ≈ the glyph edge,
 * > 128 inside, < 128 outside, saturating `radius` pixels away from the edge.
 */
export function coverageToSdf(alpha: ArrayLike<number>, width: number, height: number, radius: number): Uint8Array {
  const size = width * height
  const outer = new Float64Array(size)
  const inner = new Float64Array(size)
  for (let i = 0; i < size; i++) {
    const a = alpha[i] / 255
    outer[i] = a >= 1 ? 0 : a <= 0 ? INF : Math.max(0, 0.5 - a) ** 2
    inner[i] = a >= 1 ? INF : a <= 0 ? 0 : Math.max(0, a - 0.5) ** 2
  }
  edt2d(outer, width, height)
  edt2d(inner, width, height)
  const out = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    const dist = Math.sqrt(outer[i]) - Math.sqrt(inner[i])
    const v = 0.5 - dist / (2 * radius)
    out[i] = Math.round(255 * (v < 0 ? 0 : v > 1 ? 1 : v))
  }
  return out
}
