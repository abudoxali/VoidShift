import { useEffect } from 'react'
import { useCinematicEngine } from '../../cinematic/engine/CinematicContext'
import { TIER_ORDER } from '../../cinematic/engine/PerformanceManager'
import { selectReducedMotion, useExperience } from '../../store/experienceStore'

/**
 * Skip / Replay / Sound / Motion / Quality. All real buttons, keyboard reachable, with
 * pressed-state semantics. Esc skips the intro.
 */
export function IntroControls() {
  const engine = useCinematicEngine()
  const introComplete = useExperience((s) => s.introComplete)
  const soundEnabled = useExperience((s) => s.soundEnabled)
  const reduced = useExperience(selectReducedMotion)
  const quality = useExperience((s) => s.quality)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !useExperience.getState().introComplete) engine.skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [engine])

  const cycleQuality = () => {
    const { setQuality, quality: q } = useExperience.getState()
    const next = TIER_ORDER[(TIER_ORDER.indexOf(q.tier) + 1) % TIER_ORDER.length]
    setQuality(next, 'user')
  }

  return (
    <nav className="controls" aria-label="Intro controls">
      {introComplete ? (
        <button type="button" className="controls__button controls__button--primary" onClick={() => engine.replay()}>
          Replay intro
        </button>
      ) : (
        <button type="button" className="controls__button controls__button--primary" onClick={() => engine.skip()} aria-keyshortcuts="Escape">
          Skip intro
        </button>
      )}
      <button
        type="button"
        className="controls__button"
        aria-pressed={soundEnabled}
        onClick={() => useExperience.getState().setSoundEnabled(!soundEnabled)}
      >
        Sound {soundEnabled ? 'on' : 'off'}
      </button>
      <button
        type="button"
        className="controls__button"
        aria-pressed={reduced}
        onClick={() => useExperience.getState().setUserReducedMotion(!reduced)}
      >
        Reduced motion {reduced ? 'on' : 'off'}
      </button>
      <button type="button" className="controls__button" onClick={cycleQuality} aria-label={`Quality ${quality.tier}, change`}>
        Quality {quality.tier.toLowerCase()}
        {quality.source === 'adaptive' ? '*' : ''}
      </button>
    </nav>
  )
}
