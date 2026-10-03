import { create } from 'zustand'
import { lowerTier } from '../cinematic/engine/PerformanceManager'
import type { CinematicPhase, QualityTier } from '../cinematic/types'

/**
 * UI-level application state. Changes here are rare (phase boundaries, user toggles, quality
 * changes) — per-frame cinematic data never goes through React state.
 */
export interface ExperienceState {
  phase: CinematicPhase
  introComplete: boolean
  quality: { tier: QualityTier; source: 'auto' | 'user' | 'adaptive' }
  /** `user` overrides `system` when not null. */
  reducedMotion: { system: boolean; user: boolean | null }
  soundEnabled: boolean
  debug: boolean
  rendererError: string | null
  /** Live review mode (?review=1): developer panel, scene jumps. Never shown to visitors. */
  review: boolean
  /** Full FX, or characters + choreography only (?fx=off): no particles, trails, glyph debris or post. */
  fx: 'full' | 'off'
  skeletonDebug: boolean
  cameraDebug: boolean
  slowMotion: boolean

  setPhase(phase: CinematicPhase): void
  setIntroComplete(complete: boolean): void
  setQuality(tier: QualityTier, source: ExperienceState['quality']['source']): void
  /** Called by the runtime governor. Never overrides an explicit user choice. */
  degradeQuality(): boolean
  setSystemReducedMotion(value: boolean): void
  setUserReducedMotion(value: boolean | null): void
  setSoundEnabled(value: boolean): void
  setRendererError(message: string | null): void
  setReview(patch: Partial<Pick<ExperienceState, 'fx' | 'skeletonDebug' | 'cameraDebug' | 'slowMotion'>>): void
}

export const useExperience = create<ExperienceState>()((set, get) => ({
  phase: 'BOOT',
  introComplete: false,
  quality: { tier: 'HIGH', source: 'auto' },
  reducedMotion: { system: false, user: null },
  soundEnabled: false,
  debug: false,
  rendererError: null,
  review: false,
  fx: 'full',
  skeletonDebug: false,
  cameraDebug: false,
  slowMotion: false,

  setPhase: (phase) => set({ phase }),
  setIntroComplete: (introComplete) => set({ introComplete }),
  setQuality: (tier, source) => set({ quality: { tier, source } }),
  degradeQuality: () => {
    const { quality } = get()
    if (quality.source === 'user') return false
    const next = lowerTier(quality.tier)
    if (!next) return false
    set({ quality: { tier: next, source: 'adaptive' } })
    return true
  },
  setSystemReducedMotion: (system) => set((s) => ({ reducedMotion: { ...s.reducedMotion, system } })),
  setUserReducedMotion: (user) => set((s) => ({ reducedMotion: { ...s.reducedMotion, user } })),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setRendererError: (rendererError) => set({ rendererError }),
  setReview: (patch) => set(patch),
}))

export const selectReducedMotion = (s: ExperienceState): boolean => s.reducedMotion.user ?? s.reducedMotion.system
