import { beforeEach, describe, expect, it } from 'vitest'
import { selectReducedMotion, useExperience } from './experienceStore'

describe('experience store', () => {
  beforeEach(() => {
    useExperience.setState({ quality: { tier: 'ULTRA', source: 'auto' }, reducedMotion: { system: false, user: null } })
  })

  it('adaptive degradation steps down and stops at LITE', () => {
    const { degradeQuality } = useExperience.getState()
    expect(degradeQuality()).toBe(true)
    expect(useExperience.getState().quality).toEqual({ tier: 'HIGH', source: 'adaptive' })
    expect(degradeQuality()).toBe(true)
    expect(degradeQuality()).toBe(false)
    expect(useExperience.getState().quality.tier).toBe('LITE')
  })

  it('never overrides an explicit user quality choice', () => {
    useExperience.getState().setQuality('ULTRA', 'user')
    expect(useExperience.getState().degradeQuality()).toBe(false)
    expect(useExperience.getState().quality.tier).toBe('ULTRA')
  })

  it('user reduced-motion preference overrides the system setting', () => {
    const s = useExperience.getState()
    s.setSystemReducedMotion(true)
    expect(selectReducedMotion(useExperience.getState())).toBe(true)
    s.setUserReducedMotion(false)
    expect(selectReducedMotion(useExperience.getState())).toBe(false)
    s.setUserReducedMotion(null)
    expect(selectReducedMotion(useExperience.getState())).toBe(true)
  })
})
