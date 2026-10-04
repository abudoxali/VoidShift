import { lazy, Suspense } from 'react'
import { Overlay } from '../components/overlay/Overlay'
import { Stage } from '../components/Stage'
import { StageErrorBoundary } from '../components/StageErrorBoundary'
import { useExperience } from '../store/experienceStore'
import { CinematicProvider } from './providers/CinematicProvider'

// Development labs load only behind ?review=1&lab=… (never part of the visitor experience).
const CharacterLab = lazy(() => import('../lab/CharacterLab').then((m) => ({ default: m.CharacterLab })))

export function App() {
  const lab = useExperience((s) => s.lab)
  if (lab)
    return (
      <Suspense fallback={null}>
        <CharacterLab />
      </Suspense>
    )
  return (
    <CinematicProvider>
      <main className="experience" aria-label="VoidShift cinematic intro">
        <div className="experience__stage" role="img" aria-label="Real-time cinematic fight: AERON, a precise fighter of light, against NOX, a heavy fighter who phases through space.">
          <StageErrorBoundary>
            <Stage />
          </StageErrorBoundary>
        </div>
        <Overlay />
      </main>
    </CinematicProvider>
  )
}
