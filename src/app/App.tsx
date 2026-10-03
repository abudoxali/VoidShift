import { Overlay } from '../components/overlay/Overlay'
import { Stage } from '../components/Stage'
import { StageErrorBoundary } from '../components/StageErrorBoundary'
import { CinematicProvider } from './providers/CinematicProvider'

export function App() {
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
