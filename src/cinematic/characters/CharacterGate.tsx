import { useEffect } from 'react'
import { useCinematicEngine } from '../engine/CinematicContext'
import { useWorld } from '../scenes/WorldContext'
import { useExperience } from '../../store/experienceStore'
import { sculptTier } from './fighterBody'
import { loadCharacterGeometry } from './sculpt/loader'

/**
 * Holds the cinematic clock until both fighters' sculpted geometry exists (generated in a worker),
 * so no beat ever plays without its characters. Also exposes readiness for tests.
 */
export function CharacterGate() {
  const engine = useCinematicEngine()
  const { profile } = useWorld()
  useEffect(() => {
    let alive = true
    const tier = sculptTier(profile.tier)
    const wasPlaying = engine.playing
    engine.pause()
    useExperience.setState({ charactersReady: false })
    Promise.all([loadCharacterGeometry('aeron', tier), loadCharacterGeometry('nox', tier)]).then(
      () => {
        if (!alive) return
        useExperience.setState({ charactersReady: true })
        if (wasPlaying) engine.play()
      },
      (err) => console.error(err),
    )
    return () => void (alive = false)
  }, [engine, profile.tier])
  return null
}
