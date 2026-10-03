import { CINEMATIC_PHASES } from '../../cinematic/types'
import { useExperience } from '../../store/experienceStore'
import { IntroControls } from './IntroControls'
import { PerfReadout } from './PerfReadout'
import { Timecode } from './Timecode'

const PHASE_DESCRIPTIONS: Partial<Record<string, string>> = {
  BOOT: 'A single coordinate appears in darkness and draws the axes of a new space.',
  REVEAL: 'A computational grid resolves outward from the origin.',
  SPAWN: 'Velocity arrives at its published coordinate; then space bends and the Void tears open.',
}

/**
 * Minimal DOM chrome. Lives in the letterbox margins; the cinematic image stays clean.
 * Later milestones reconstruct the website from this layer.
 */
export function Overlay() {
  const phase = useExperience((s) => s.phase)
  const debug = useExperience((s) => s.debug)
  const rendererError = useExperience((s) => s.rendererError)
  const index = CINEMATIC_PHASES.indexOf(phase) + 1

  return (
    <div className="overlay">
      <header className="hud hud--top">
        <h1 className="hud__mark">VoidShift</h1>
        <p className="hud__phase">
          <span className="hud__index">{String(index).padStart(2, '0')}</span>
          <span className="hud__label">{phase.replace('_', ' ')}</span>
          <Timecode />
        </p>
      </header>
      <p className="visually-hidden" aria-live="polite">
        {PHASE_DESCRIPTIONS[phase] ?? phase}
      </p>
      <footer className="hud hud--bottom">
        <IntroControls />
      </footer>
      {rendererError ? (
        <p className="overlay__error" role="alert">
          {rendererError}
        </p>
      ) : null}
      {debug ? <PerfReadout /> : null}
    </div>
  )
}
