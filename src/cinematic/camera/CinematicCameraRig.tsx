import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useState } from 'react'
import { MathUtils, Vector3, type PerspectiveCamera } from 'three'
import { useCinematicEngine } from '../engine/CinematicContext'
import { CUES } from '../engine/cues'
import { FRAME_STAGE } from '../engine/frameStages'
import { useWorld } from '../scenes/WorldContext'
import type { EntityId } from '../types'
import { CameraRig } from './CameraRig'

const ORIGIN = new Vector3()

/**
 * Applies the timeline-driven camera to the R3F default camera. There is no user camera
 * control: camera choreography is authored, never free.
 */
export function CinematicCameraRig() {
  const engine = useCinematicEngine()
  const { uniforms } = useWorld()
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)
  const [rig] = useState(() => new CameraRig())
  const resolve = useCallback(
    (id: EntityId): Vector3 => (id === 'velocity' ? uniforms.uVelocityPos.value : id === 'void' ? engine.state.void.position : ORIGIN),
    [engine, uniforms],
  )

  useEffect(() => {
    const offCue = engine.on('cue', (cue) => {
      if (cue.name === CUES.CAMERA_SHAKE) rig.addShake(cue.data.amount ?? 0.3)
      else if (cue.name === CUES.CAMERA_CUT) rig.snap()
    })
    const offSeek = engine.on('seek', () => {
      rig.snap()
      rig.trauma = 0
    })
    return () => {
      offCue()
      offSeek()
    }
  }, [engine, rig])

  useEffect(() => {
    camera.near = 0.05
    camera.far = 400
    camera.updateProjectionMatrix()
  }, [camera])

  useFrame(() => {
    rig.shakeScale = engine.motion.shake
    rig.update(engine.state.camera, resolve, size.width / Math.max(size.height, 1), engine.elapsed, engine.dt)
    rig.apply(camera)
    uniforms.uPointScale.value = (size.height * dpr) / (2 * Math.tan(MathUtils.degToRad(camera.fov) / 2))
  }, FRAME_STAGE.CAMERA)

  return null
}
