import { describe, expect, it } from 'vitest'
import {
  FrameRateMonitor,
  PARTICLE_CAPACITY,
  QUALITY_PROFILES,
  TIER_ORDER,
  detectQualityTier,
  lowerTier,
  parseQualityOverride,
} from './PerformanceManager'

describe('quality profiles', () => {
  it('scale monotonically from LITE to ULTRA', () => {
    for (let i = 1; i < TIER_ORDER.length; i++) {
      const lo = QUALITY_PROFILES[TIER_ORDER[i - 1]]
      const hi = QUALITY_PROFILES[TIER_ORDER[i]]
      expect(hi.maxDpr).toBeGreaterThanOrEqual(lo.maxDpr)
      expect(hi.gridSegments).toBeGreaterThan(lo.gridSegments)
      expect(hi.particles.field).toBeGreaterThan(lo.particles.field)
      expect(hi.particles.accretion).toBeGreaterThan(lo.particles.accretion)
    }
  })

  it('never exceeds the preallocated particle capacity', () => {
    for (const tier of TIER_ORDER) {
      const p = QUALITY_PROFILES[tier].particles
      expect(p.field).toBeLessThanOrEqual(PARTICLE_CAPACITY.field)
      expect(p.velocity).toBeLessThanOrEqual(PARTICLE_CAPACITY.velocity)
      expect(p.accretion).toBeLessThanOrEqual(PARTICLE_CAPACITY.accretion)
    }
  })

  it('steps down one tier at a time', () => {
    expect(lowerTier('ULTRA')).toBe('HIGH')
    expect(lowerTier('HIGH')).toBe('LITE')
    expect(lowerTier('LITE')).toBeNull()
  })
})

describe('detectQualityTier', () => {
  const desktop = { coarsePointer: false, screenMin: 1080, saveData: false }
  it('classifies typical devices', () => {
    expect(detectQualityTier({ ...desktop, cores: 12, memoryGb: 16 })).toBe('ULTRA')
    expect(detectQualityTier({ ...desktop, cores: 12 })).toBe('ULTRA')
    expect(detectQualityTier({ ...desktop, cores: 6, memoryGb: 8 })).toBe('HIGH')
    expect(detectQualityTier({ ...desktop, cores: 2, memoryGb: 4 })).toBe('LITE')
    expect(detectQualityTier({ coarsePointer: true, screenMin: 390, saveData: false, cores: 8 })).toBe('LITE')
    expect(detectQualityTier({ coarsePointer: true, screenMin: 820, saveData: false, cores: 8 })).toBe('HIGH')
  })
  it('respects data saver', () => {
    expect(detectQualityTier({ ...desktop, cores: 16, memoryGb: 32, saveData: true })).toBe('LITE')
  })
  it('defaults sensibly when signals are missing', () => {
    expect(detectQualityTier(desktop)).toBe('HIGH')
  })
})

describe('parseQualityOverride', () => {
  it('accepts known tiers case-insensitively', () => {
    expect(parseQualityOverride('?quality=lite')).toBe('LITE')
    expect(parseQualityOverride('?debug&quality=ULTRA')).toBe('ULTRA')
    expect(parseQualityOverride('?quality=potato')).toBeNull()
    expect(parseQualityOverride('')).toBeNull()
  })
})

describe('FrameRateMonitor', () => {
  const run = (m: FrameRateMonitor, fps: number, seconds: number, tier: 'ULTRA' | 'HIGH' | 'LITE') => {
    let hit = false
    for (let t = 0; t < seconds; t += 1 / fps) hit = m.sample(1 / fps, tier) || hit
    return hit
  }

  it('ignores the warm-up period', () => {
    const m = new FrameRateMonitor({ warmup: 3, window: 1, strikes: 1 })
    expect(run(m, 10, 2.9, 'ULTRA')).toBe(false)
  })

  it('downgrades only after sustained slow windows', () => {
    const m = new FrameRateMonitor({ warmup: 0, window: 1, strikes: 2 })
    expect(run(m, 30, 1.05, 'ULTRA')).toBe(false)
    expect(run(m, 30, 1.05, 'ULTRA')).toBe(true)
  })

  it('a single fast window clears accumulated strikes', () => {
    const m = new FrameRateMonitor({ warmup: 0, window: 1, strikes: 2 })
    run(m, 30, 1.05, 'ULTRA')
    run(m, 60, 1.05, 'ULTRA')
    expect(run(m, 30, 1.05, 'ULTRA')).toBe(false)
  })

  it('never downgrades below LITE and ignores stalls', () => {
    const m = new FrameRateMonitor({ warmup: 0, window: 1, strikes: 1 })
    expect(run(m, 5, 5, 'LITE')).toBe(false)
    expect(m.sample(3, 'ULTRA')).toBe(false)
  })
})
