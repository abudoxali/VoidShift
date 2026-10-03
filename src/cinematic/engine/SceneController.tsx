import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useState, type ReactNode } from 'react'
import { Vector3 } from 'three'
import { useExperience } from '../../store/experienceStore'
import { recordFrameStats } from '../../utils/renderStats'
import { velocityIdleOffset } from '../entities/Velocity/idle'
import { WorldContext, type WorldContextValue } from '../scenes/WorldContext'
import { createWorldUniforms } from '../shaders'
import { useCinematicEngine } from './CinematicContext'
import { FRAME_STAGE } from './frameStages'
import { FrameRateMonitor, QUALITY_PROFILES } from './PerformanceManager'

/**
 * Bridges the pure CinematicEngine into the R3F frame loop:
 *  1. advances the engine exactly once per frame (first callback of the frame),
 *  2. derives the shared world field (uniforms read by every world material),
 *  3. feeds the runtime performance governor.
 * Provides the world uniforms + active quality profile to the scene graph.
 */
export function SceneController({ children }: { children: ReactNode }) {
  const engine = useCinematicEngine()
  const tier = useExperience((s) => s.quality.tier)
  const [uniforms] = useState(createWorldUniforms)
  const [monitor] = useState(() => new FrameRateMonitor())
  const idle = useMemo(() => new Vector3(), [])
  const gl = useThree((s) => s.gl)

  const value = useMemo<WorldContextValue>(() => ({ uniforms, profile: QUALITY_PROFILES[tier] }), [uniforms, tier])

  useFrame((_, delta) => {
    // In ?debug mode renderer stats accumulate across all passes of a frame.
    if (!gl.info.autoReset) {
      recordFrameStats(gl)
      gl.info.reset()
    }
    engine.update(delta)
    const s = engine.state

    uniforms.uTime.value = engine.elapsed
    uniforms.uMotion.value = engine.motion.ambient
    uniforms.uVoidPos.value.copy(s.void.position)
    uniforms.uVoidMass.value = s.void.mass
    uniforms.uVoidRadius.value = s.void.radius
    velocityIdleOffset(engine.elapsed, s.velocity.idle * engine.motion.ambient, idle)
    uniforms.uVelocityPos.value.copy(s.velocity.position).add(idle)
    uniforms.uVelocityEnergy.value = s.velocity.energy * s.velocity.reveal
    uniforms.uVoidPhase.value = s.void.phase
    uniforms.uVoidFold.value = s.void.fold
    uniforms.uVoidInversion.value = s.void.inversion
    const axis = uniforms.uPhaseAxis.value.subVectors(s.attack.to, s.attack.from)
    if (axis.lengthSq() < 1e-8) axis.set(1, 0, 0)
    axis.normalize()
    const split = uniforms.uSplitAxis.value.set(-axis.z, 0, axis.x)
    if (split.lengthSq() < 1e-8) split.set(0, 0, 1)
    split.normalize()

    if (monitor.sample(delta, tier)) {
      if (useExperience.getState().degradeQuality()) monitor.reset()
    }
  }, FRAME_STAGE.ENGINE)

  return <WorldContext value={value}>{children}</WorldContext>
}
