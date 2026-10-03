import type { QualityTier } from '../types'

/**
 * Everything quality-dependent lives in one profile so that rendering systems never
 * branch on device type themselves — they read the active profile.
 */
export interface QualityProfile {
  readonly tier: QualityTier
  /** Upper bound for the device pixel ratio. */
  readonly maxDpr: number
  /** MSAA samples for the post-processing composer (0 = off). */
  readonly msaa: number
  readonly bloom: { readonly enabled: boolean; readonly levels: number }
  /** Chromatic split inside the void lens (3 texture taps instead of 1). */
  readonly lensChroma: boolean
  readonly grain: boolean
  /** Subdivisions of the world grid plane (vertex displacement resolution). */
  readonly gridSegments: number
  /** FBM octaves in the atmosphere shader. */
  readonly atmosphereOctaves: number
  readonly particles: {
    readonly field: number
    readonly velocity: number
    readonly accretion: number
  }
  readonly trailLength: number
}

export const QUALITY_PROFILES: Readonly<Record<QualityTier, QualityProfile>> = {
  ULTRA: {
    tier: 'ULTRA',
    maxDpr: 2,
    msaa: 4,
    bloom: { enabled: true, levels: 8 },
    lensChroma: true,
    grain: true,
    gridSegments: 320,
    atmosphereOctaves: 4,
    particles: { field: 7000, velocity: 1400, accretion: 5000 },
    trailLength: 96,
  },
  HIGH: {
    tier: 'HIGH',
    maxDpr: 1.5,
    msaa: 2,
    bloom: { enabled: true, levels: 6 },
    lensChroma: true,
    grain: true,
    gridSegments: 220,
    atmosphereOctaves: 3,
    particles: { field: 4500, velocity: 900, accretion: 3200 },
    trailLength: 72,
  },
  LITE: {
    tier: 'LITE',
    maxDpr: 1.25,
    msaa: 0,
    bloom: { enabled: true, levels: 4 },
    lensChroma: false,
    grain: false,
    gridSegments: 128,
    atmosphereOctaves: 2,
    particles: { field: 2000, velocity: 450, accretion: 1600 },
    trailLength: 48,
  },
}

/**
 * Particle buffers are allocated once at the largest size and quality changes only adjust
 * the draw range. Seeds are independent per particle, so any prefix is a uniform subsample.
 */
export const PARTICLE_CAPACITY = QUALITY_PROFILES.ULTRA.particles

export const TIER_ORDER: readonly QualityTier[] = ['LITE', 'HIGH', 'ULTRA']

export function lowerTier(tier: QualityTier): QualityTier | null {
  const i = TIER_ORDER.indexOf(tier)
  return i > 0 ? TIER_ORDER[i - 1] : null
}

/** Coarse, non-identifying capability signals. No GPU strings, no canvas fingerprinting. */
export interface DeviceSignals {
  readonly cores?: number
  readonly memoryGb?: number
  readonly coarsePointer: boolean
  readonly screenMin: number
  readonly saveData: boolean
}

export function readDeviceSignals(): DeviceSignals {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  return {
    cores: nav.hardwareConcurrency || undefined,
    memoryGb: nav.deviceMemory,
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    screenMin: Math.min(window.screen?.width ?? window.innerWidth, window.screen?.height ?? window.innerHeight),
    saveData: nav.connection?.saveData ?? false,
  }
}

export function detectQualityTier(s: DeviceSignals): QualityTier {
  if (s.saveData) return 'LITE'
  const lowCores = s.cores !== undefined && s.cores <= 4
  const lowMemory = s.memoryGb !== undefined && s.memoryGb <= 4
  if (s.coarsePointer) {
    // Phones: LITE. Tablets: HIGH unless clearly constrained.
    if (s.screenMin < 600 || lowCores || lowMemory) return 'LITE'
    return 'HIGH'
  }
  if ((s.cores !== undefined && s.cores <= 2) || (s.memoryGb !== undefined && s.memoryGb <= 2)) return 'LITE'
  if ((s.cores ?? 0) >= 8 && (s.memoryGb === undefined || s.memoryGb >= 8)) return 'ULTRA'
  return 'HIGH'
}

export function parseQualityOverride(search: string): QualityTier | null {
  const value = new URLSearchParams(search).get('quality')?.toUpperCase()
  return value === 'ULTRA' || value === 'HIGH' || value === 'LITE' ? value : null
}

/** Minimum sustained FPS before a tier is considered too expensive. */
const DOWNGRADE_BELOW: Readonly<Record<QualityTier, number>> = { ULTRA: 50, HIGH: 34, LITE: 0 }

export interface FrameRateMonitorOptions {
  /** Seconds ignored after start/reset (shader compilation, first uploads). */
  warmup?: number
  /** Measurement window length in seconds. */
  window?: number
  /** Consecutive slow windows required before acting (hysteresis). */
  strikes?: number
}

/**
 * Runtime governor: watches real frame times and recommends a downgrade only after
 * sustained under-performance. It never upgrades on its own, which prevents oscillation.
 */
export class FrameRateMonitor {
  private readonly warmup: number
  private readonly windowLength: number
  private readonly strikesNeeded: number
  private age = 0
  private windowTime = 0
  private windowFrames = 0
  private strikes = 0
  lastFps = 0

  constructor({ warmup = 2.5, window = 2, strikes = 2 }: FrameRateMonitorOptions = {}) {
    this.warmup = warmup
    this.windowLength = window
    this.strikesNeeded = strikes
  }

  reset(): void {
    this.age = 0
    this.windowTime = 0
    this.windowFrames = 0
    this.strikes = 0
  }

  /** Feed one real (unclamped) frame delta. Returns true when a downgrade is recommended. */
  sample(dt: number, tier: QualityTier): boolean {
    // Ignore stalls longer than half a second (tab switches, breakpoints): not render cost.
    if (dt <= 0 || dt > 0.5) return false
    this.age += dt
    if (this.age < this.warmup) return false
    this.windowTime += dt
    this.windowFrames++
    if (this.windowTime < this.windowLength) return false

    const fps = this.windowFrames / this.windowTime
    this.lastFps = fps
    this.windowTime = 0
    this.windowFrames = 0
    if (fps < DOWNGRADE_BELOW[tier]) {
      this.strikes++
      if (this.strikes >= this.strikesNeeded) {
        this.reset()
        return true
      }
    } else {
      this.strikes = 0
    }
    return false
  }
}
