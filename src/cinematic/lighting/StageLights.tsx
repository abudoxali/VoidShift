import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { Color, DirectionalLight, HemisphereLight, Object3D, SpotLight, Vector3 } from 'three'
import { useCinematicEngine } from '../engine/CinematicContext'
import { FRAME_STAGE } from '../engine/frameStages'

/**
 * Stage lighting. Characters are lit physically (standard materials); every intensity is driven
 * by the timeline (`state.lights`). Rim lights sit BEHIND the fighters so their silhouettes cut
 * out of the dark — cyan behind AERON, violet behind NOX. They are narrow spots aimed at their
 * own fighter (not stage-wide directionals), so one fighter's colour does not wash over the
 * other's face. Energy lights (fighters, Code Core, impact) live with their sources.
 */
export function StageLights() {
  const engine = useCinematicEngine()
  const camera = useThree((st) => st.camera)
  const rig = useMemo(() => {
    const hemi = new HemisphereLight(new Color(0.16, 0.32, 0.38), new Color(0.01, 0.015, 0.02), 0)
    const key = new DirectionalLight(new Color(0.75, 0.86, 1.0), 0)
    key.position.set(3, 7, 9)
    // ~1.25 m cone radius at the fighter, soft edge, no distance falloff (matches the old directionals).
    const rimSpot = (color: Color) => new SpotLight(color, 0, 0, 0.17, 0.6, 0)
    const rimV = rimSpot(new Color(0.4, 0.88, 1.0))
    const rimVTarget = new Object3D()
    rimV.target = rimVTarget
    const rimD = rimSpot(new Color(0.72, 0.4, 0.95))
    const rimDTarget = new Object3D()
    rimD.target = rimDTarget
    // Camera key: a soft light from above and to the left of whatever shot is live, aimed at the
    // shot's subject. Faces stay readable in every shot without raising exposure.
    const camKey = new DirectionalLight(new Color(0.85, 0.92, 1.0), 0)
    const camKeyTarget = new Object3D()
    camKey.target = camKeyTarget
    return { hemi, key, rimV, rimVTarget, rimD, rimDTarget, camKey, camKeyTarget, side: new Vector3(), up: new Vector3() }
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
    // Camera key: offset up and to the camera's left, pointed at the shot target.
    camera.getWorldDirection(rig.side).cross(camera.up).normalize()
    rig.camKey.position.copy(camera.position).addScaledVector(rig.side, -1.6).add(rig.up.set(0, 1.8, 0))
    rig.camKeyTarget.position.copy(s.camera.target)
    rig.camKey.intensity = (0.35 + l.key * 0.9) * Math.min(1, s.fighters.velocity.reveal + s.fighters.void.reveal)
  }, FRAME_STAGE.LATE)

  return (
    <>
      <primitive object={rig.hemi} dispose={null} />
      <primitive object={rig.key} dispose={null} />
      <primitive object={rig.rimV} dispose={null} />
      <primitive object={rig.rimVTarget} dispose={null} />
      <primitive object={rig.rimD} dispose={null} />
      <primitive object={rig.rimDTarget} dispose={null} />
      <primitive object={rig.camKey} dispose={null} />
      <primitive object={rig.camKeyTarget} dispose={null} />
    </>
  )
}
