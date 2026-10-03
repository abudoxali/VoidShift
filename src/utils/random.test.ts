import { describe, expect, it } from 'vitest'
import { createRng } from './random'

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })

  it('produces values in [0, 1) with a sane spread', () => {
    const rng = createRng(7)
    let min = 1
    let max = 0
    let sum = 0
    const n = 10000
    for (let i = 0; i < n; i++) {
      const v = rng()
      min = Math.min(min, v)
      max = Math.max(max, v)
      sum += v
    }
    expect(min).toBeGreaterThanOrEqual(0)
    expect(max).toBeLessThan(1)
    expect(sum / n).toBeGreaterThan(0.47)
    expect(sum / n).toBeLessThan(0.53)
  })
})
