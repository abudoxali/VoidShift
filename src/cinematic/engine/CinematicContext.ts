import { createContext, use } from 'react'
import type { CinematicEngine } from './CinematicEngine'

export const CinematicContext = createContext<CinematicEngine | null>(null)

/** Access the single cinematic engine (works inside and outside the R3F canvas). */
export function useCinematicEngine(): CinematicEngine {
  const engine = use(CinematicContext)
  if (!engine) throw new Error('useCinematicEngine must be used inside <CinematicProvider>')
  return engine
}
