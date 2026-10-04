import { CINEMATIC_PHASES } from '../../cinematic/types'
import { useExperience } from '../../store/experienceStore'
import { CameraDebugOverlay, ReviewPanel } from '../review/ReviewPanel'
import { IntroControls } from './IntroControls'
import { PerfReadout } from './PerfReadout'
import { Timecode } from './Timecode'

const PHASE_DESCRIPTIONS: Partial<Record<string, string>> = {
  BOOT: 'Darkness. NOX is already there — two violet eyes. AERON reconstructs from light.',
  REVEAL: 'Standoff. AERON lowers his stance; NOX raises his guard.',
  SPAWN: 'AERON explodes forward with a straight punch; it passes through NOX, who counters with an elbow.',
  ENGAGE: 'Close combat: a body kick blocked, a grab escaped, a spinning kick phased through.',
  PHASE: 'Ordinary attacks fail. AERON forms a coordinate anchor and throws it past NOX.',
  TELEPORT: 'AERON attacks again, comes apart inside NOX, and reconstructs at the anchor behind him.',
  LOCK: 'NOX turns — head, shoulders, torso — too late. AERON is above and behind him.',
  CORE_CHARGE: 'The Code Core forms in AERON’s hand. He drives it into NOX.',
  IMPACT: 'Impact. NOX is driven down; AERON lands in the aftermath.',
}

/**
 * Minimal DOM chrome. Lives in the letterbox margins; the cinematic image stays clean.
 * Later milestones reconstruct the website from this layer.
 */
export function Overlay() {
  const phase = useExperience((s) => s.phase)
  const debug = useExperience((s) => s.debug)
  const rendererError = useExperience((s) => s.rendererError)
  const review = useExperience((s) => s.review)
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
      {review ? <ReviewPanel /> : null}
      {review ? <CameraDebugOverlay /> : null}
    </div>
  )
}
