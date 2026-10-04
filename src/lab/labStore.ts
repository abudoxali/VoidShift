import { create } from 'zustand'
import type { ExpressionName } from '../cinematic/characters/sculpt/expressions'
import type { QualityTier } from '../cinematic/types'

export type LabFighter = 'aeron' | 'nox'
export type LabView = 'front' | 'three-quarter' | 'side' | 'back' | 'face' | 'face-34' | 'hands'
export type LabLight = 'studio' | 'arena' | 'standoff' | 'core' | 'flat'

/** Hidden development lab state (?review=1&lab=characters | animation). */
export interface LabState {
  fighter: LabFighter
  view: LabView
  light: LabLight
  pose: string
  /** Animation lab: the clip being looped. */
  clip: string
  expression: ExpressionName
  wireframe: boolean
  skeleton: boolean
  turntable: boolean
  tier: QualityTier
  /** Readouts from the scene. */
  stats: { triangles: number; ms: number; calls: number }
  set(patch: Partial<Omit<LabState, 'set'>>): void
}

/** Initial lab state from the URL: &fighter=nox&view=face&pose=guard&light=standoff&face=strain&tier=high */
function fromUrl() {
  const q = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const v = q.get(key)?.toLowerCase()
    return (allowed.find((a) => a.toLowerCase() === v) ?? fallback) as T
  }
  return {
    fighter: pick<LabFighter>('fighter', ['aeron', 'nox'], 'aeron'),
    view: pick<LabView>('view', ['front', 'three-quarter', 'side', 'back', 'face', 'face-34', 'hands'], 'three-quarter'),
    light: pick<LabLight>('light', ['studio', 'arena', 'standoff', 'core', 'flat'], 'arena'),
    tier: pick<QualityTier>('tier', ['ULTRA', 'HIGH', 'LITE'], 'HIGH'),
    pose: q.get('pose') ?? 'stand',
    clip: q.get('clip') ?? 'punch',
    expression: (q.get('face') ?? 'neutral') as ExpressionName,
    wireframe: q.has('wireframe'),
    skeleton: q.has('skeleton'),
  }
}

export const useLab = create<LabState>()((set) => ({
  turntable: false,
  ...fromUrl(),
  stats: { triangles: 0, ms: 0, calls: 0 },
  set: (patch) => set(patch),
}))
