import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Color, DirectionalLight, HemisphereLight, Object3D } from 'three'
import { useCinematicEngine } from '../engine/CinematicContext'
import { FRAME_STAGE } from '../engine/frameStages'

/**
 * Stage lighting. Characters are lit physically (standard materials); every intensity is driven
 * by the timeline (`state.lights`). Rim lights sit BEHIND the fighters so their silhouettes cut
 * out of the dark — cyan behind VELOCITY, violet behind VOID. Energy lights (fighters, Code
 * Core, impact) live with their sources.
 */
export function StageLights() {
  const engine = useCinematicEngine()
  const rig = useMemo(() => {
    const hemi = new HemisphereLight(new Color(0.16, 0.32, 0.38), new Color(0.01, 0.015, 0.02), 0)
    const key = new DirectionalLight(new Color(0.75, 0.86, 1.0), 0)
    key.position.set(3, 7, 9)
    const rimV = new DirectionalLight(new Color(0.35, 0.9, 1.0), 0)
    const rimVTarget = new Object3D()
    rimV.target = rimVTarget
    const rimD = new DirectionalLight(new Color(0.7, 0.3, 1.0), 0)
    const rimDTarget = new Object3D()
    rimD.target = rimDTarget
    return { hemi, key, rimV, rimVTarget, rimD, rimDTarget }
  }, [])

  useFrame(() => {
    const s = engine.state
    const l = s.lights
    rig.hemi.intensity = l.ambient * 1.4
    rig.key.intensity = l.key * 1.3
    // Rims track their fighter from behind and above (relative to the stage, not the camera).
    const v = s.fighters.velocity.position
    rig.rimVTarget.position.set(v.x, v.y + 1.2, v.z)
    rig.rimV.position.set(v.x - 2.5, v.y + 4.5, v.z - 6)
    rig.rimV.intensity = l.rimVelocity * 3.2
    const d = s.fighters.void.position
    rig.rimDTarget.position.set(d.x, d.y + 1.2, d.z)
    rig.rimD.position.set(d.x + 3, d.y + 4.5, d.z - 6)
    rig.rimD.intensity = l.rimVoid * 3.6
  }, FRAME_STAGE.WORLD)

  return (
    <>
      <primitive object={rig.hemi} dispose={null} />
      <primitive object={rig.key} dispose={null} />
      <primitive object={rig.rimV} dispose={null} />
      <primitive object={rig.rimVTarget} dispose={null} />
      <primitive object={rig.rimD} dispose={null} />
      <primitive object={rig.rimDTarget} dispose={null} />
    </>
  )
}
