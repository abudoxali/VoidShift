import { describe, expect, it } from 'vitest'
import { letterboxFor } from './CinematicGradeEffect'

describe('letterboxFor', () => {
  it('letterboxes 16:9 to a cinematic ratio', () => {
    const bar = letterboxFor(16 / 9)
    const visible = 1 - 2 * bar
    expect((16 / 9) / visible).toBeCloseTo(2.2, 2)
  })
  it('never letterboxes portrait or ultra-wide screens', () => {
    expect(letterboxFor(390 / 844)).toBe(0)
    expect(letterboxFor(1)).toBe(0)
    expect(letterboxFor(2.4)).toBe(0)
  })
})
