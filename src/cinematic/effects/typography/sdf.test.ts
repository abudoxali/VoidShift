import { describe, expect, it } from 'vitest'
import { coverageToSdf, edt2d } from './sdf'

describe('edt2d', () => {
  it('computes exact squared euclidean distances to a single feature', () => {
    const w = 9
    const h = 7
    const grid = new Float64Array(w * h).fill(1e20)
    grid[3 * w + 4] = 0
    edt2d(grid, w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) expect(grid[y * w + x]).toBe((x - 4) ** 2 + (y - 3) ** 2)
  })
})

describe('coverageToSdf', () => {
  it('encodes inside > 0.5, edge ≈ 0.5, far outside = 0', () => {
    const w = 32
    const h = 32
    const alpha = new Uint8Array(w * h)
    for (let y = 10; y < 22; y++) for (let x = 10; x < 22; x++) alpha[y * w + x] = 255
    const sdf = coverageToSdf(alpha, w, h, 4)
    expect(sdf[16 * w + 16]).toBe(255)
    expect(sdf[0]).toBe(0)
    const edge = (sdf[16 * w + 9] + sdf[16 * w + 10]) / 2
    expect(Math.abs(edge - 128)).toBeLessThan(40)
    // Monotonic across the edge.
    for (let x = 4; x < 16; x++) expect(sdf[16 * w + x + 1]).toBeGreaterThanOrEqual(sdf[16 * w + x])
  })
})
