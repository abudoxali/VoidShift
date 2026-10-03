import { Canvas } from '@react-three/fiber'
import { attachRendererToDebugHandle } from '../app/providers/debugHandle'
import { QUALITY_PROFILES } from '../cinematic/engine/PerformanceManager'
import { FoundationScene } from '../cinematic/scenes/FoundationScene'
import { useDevicePixelRatio } from '../hooks/useDevicePixelRatio'
import { useExperience } from '../store/experienceStore'

/**
 * The WebGL stage. Fills the viewport; DPR is the device ratio clamped by the active quality
 * profile. Antialiasing is done by the post-processing composer (MSAA per profile).
 */
export function Stage() {
  const tier = useExperience((s) => s.quality.tier)
  const debug = useExperience((s) => s.debug)
  const deviceDpr = useDevicePixelRatio()
  const dpr = Math.min(Math.max(deviceDpr, 1), QUALITY_PROFILES[tier].maxDpr)

  return (
    <Canvas
      className="stage"
      dpr={dpr}
      frameloop="always"
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        depth: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: debug,
      }}
      camera={{ fov: 26, near: 0.05, far: 400, position: [0.55, 0.32, 2.4] }}
      onCreated={({ gl }) => {
        gl.setClearColor('#020405', 1)
        const canvas = gl.domElement
        canvas.addEventListener('webglcontextlost', (event) => {
          event.preventDefault()
          useExperience.getState().setRendererError('The graphics context was lost. Reload to restart the sequence.')
        })
        canvas.addEventListener('webglcontextrestored', () => useExperience.getState().setRendererError(null))
        if (debug) {
          gl.info.autoReset = false
          attachRendererToDebugHandle(gl)
        }
      }}
    >
      <FoundationScene />
    </Canvas>
  )
}
