import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useState, type ReactNode } from 'react'
import { Vector3 } from 'three'
import { useExperience } from '../../store/experienceStore'
import { recordFrameStats } from '../../utils/renderStats'
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
    const vel = s.fighters.velocity
    const vd = s.fighters.void
    // The world field: VOID's gravity bends the floor and the data; VELOCITY energises them.
    uniforms.uVoidPos.value.copy(vd.position).add(CHEST)
    uniforms.uVoidMass.value = s.world.voidField * vd.reveal
    uniforms.uVoidRadius.value = 0.42
    uniforms.uVelocityPos.value.copy(vel.position).add(CHEST)
    uniforms.uVelocityEnergy.value = vel.energy * vel.reveal
    uniforms.uVoidPhase.value = vd.phase
    uniforms.uVoidFold.value = 0
    uniforms.uVoidInversion.value = 0
    uniforms.uPhaseAxis.value.subVectors(vd.position, vel.position).setY(0)
    if (uniforms.uPhaseAxis.value.lengthSq() < 1e-8) uniforms.uPhaseAxis.value.set(1, 0, 0)
    uniforms.uPhaseAxis.value.normalize()
    uniforms.uSplitAxis.value.set(-uniforms.uPhaseAxis.value.z, 0, uniforms.uPhaseAxis.value.x)

    if (monitor.sample(delta, tier)) {
      if (useExperience.getState().degradeQuality()) monitor.reset()
    }
  }, FRAME_STAGE.ENGINE)

  return <WorldContext value={value}>{children}</WorldContext>
}

const CHEST = new Vector3(0, 1.25, 0)
