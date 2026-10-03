import { createContext, use } from 'react'
import type { QualityProfile } from '../engine/PerformanceManager'
import type { WorldUniforms } from '../shaders'

export interface WorldContextValue {
  readonly uniforms: WorldUniforms
  readonly profile: QualityProfile
}

export const WorldContext = createContext<WorldContextValue | null>(null)

export function useWorld(): WorldContextValue {
  const world = use(WorldContext)
  if (!world) throw new Error('useWorld must be used inside <SceneController>')
  return world
}
