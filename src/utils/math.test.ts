import { describe, expect, it } from 'vitest'
import { clamp, damp, smoothstep } from './math'

describe('math helpers', () => {
  it('clamps', () => {
    expect(clamp(2)).toBe(1)
    expect(clamp(-1)).toBe(0)
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('smoothstep is 0/1 at the edges', () => {
    expect(smoothstep(0, 1, -1)).toBe(0)
    expect(smoothstep(0, 1, 2)).toBe(1)
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5)
  })

  it('damp is frame-rate independent', () => {
    let oneStep = 0
    oneStep = damp(oneStep, 10, 4, 0.1)
    let manySteps = 0
    for (let i = 0; i < 10; i++) manySteps = damp(manySteps, 10, 4, 0.01)
    expect(manySteps).toBeCloseTo(oneStep, 10)
  })
})
