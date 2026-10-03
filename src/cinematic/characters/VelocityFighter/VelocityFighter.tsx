import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Color, PointLight, Vector3 } from 'three'
import { VELOCITY_POSES, VELOCITY_PROPORTIONS } from '../../animation/poses/velocityPoses'
import type { JointName } from '../../animation/skeleton'
import { CodeCore } from '../../effects/energy/CodeCore'
import { PoseGhosts } from '../../effects/trails/PoseGhosts'
import { VectorTrail } from '../../effects/trails/VectorTrail'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { FRAME_STAGE } from '../../engine/frameStages'
import { useWorld } from '../../scenes/WorldContext'
import { smoothstep } from '../../../utils/math'
import { createFighterUniforms } from '../fighterMaterials'
import { disposeGeometries } from '../bodyParts'
import { RigidBatch } from '../RigidBatch'
import { driveFighter, useFighterRigObject } from '../useFighterRig'
import { VELOCITY_COLORS, buildVelocityBody } from './buildVelocityBody'

const TRAILED: JointName[] = ['handR', 'handL', 'footL', 'footR']
const GHOST_RATE = 30
const ACCENT = new Color(...VELOCITY_COLORS.accent)

/**
 * VELOCITY — the fast fighter. Pose-driven rig with luminous accents, limb light trails, a
 * scarf of light streaming from the neck, pose afterimages at speed and a cyan light that
 * illuminates the world around it.
 */
export function VelocityFighter() {
  const engine = useCinematicEngine()
  const { uniforms: world, profile } = useWorld()
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)
  const fr = useFighterRigObject(VELOCITY_PROPORTIONS)
  const uniforms = useMemo(() => createFighterUniforms(VELOCITY_COLORS.dissolve), [])
  const body = useMemo(() => buildVelocityBody(fr.rig, uniforms, VELOCITY_PROPORTIONS), [fr, uniforms])
  useEffect(
    () => () => {
      disposeGeometries(fr.outer)
      Object.values(body.materials).forEach((m) => m.dispose())
    },
    [fr, body],
  )

  // Draw-call batching: ~50 body parts draw through one mesh/line per material.
  const batch = useMemo(() => new RigidBatch(fr.outer, 'velocity', body.materials), [fr, body])
  useEffect(() => () => batch.dispose(), [batch])

  const light = useMemo(() => {
    const l = new PointLight(new Color(0.45, 0.95, 1.0), 0, 7, 2)
    return l
  }, [])

  const trails = useMemo(() => {
    const len = Math.max(20, Math.round(profile.trailLength * 0.45))
    const limbs = TRAILED.map(() => new VectorTrail({ length: len, width: 5, color: [0.4, 1.4, 2.0] }))
    const scarf = new VectorTrail({ length: Math.round(len * 1.4), width: 9, color: [0.35, 1.2, 1.8] })
    return { limbs, scarf }
  }, [profile.trailLength])
  useEffect(() => () => [...trails.limbs, trails.scarf].forEach((t) => t.dispose()), [trails])

  const ghosts = useMemo(() => new PoseGhosts(10, world, [0.35, 1.1, 1.7]), [world])
  useEffect(() => () => ghosts.dispose(), [ghosts])

  const scratch = useMemo(() => ({ p: new Vector3(), visible: false, lastGhost: -1, scarf: new Vector3(), back: new Vector3() }), [])
  useEffect(() => engine.on('seek', () => (ghosts.clear(), (scratch.visible = false))), [engine, ghosts, scratch])

  useFrame(() => {
    const f = engine.state.fighters.velocity
    driveFighter(f, fr, VELOCITY_POSES, VELOCITY_POSES.idle, engine)
    batch.update(fr.outer.visible)
    uniforms.uReveal.value = f.reveal
    const e = 0.45 + f.energy * 0.9
    body.materials.accent.color.copy(ACCENT).multiplyScalar(e)
    body.materials.edge.color.setRGB(VELOCITY_COLORS.edge[0] * e, VELOCITY_COLORS.edge[1] * e, VELOCITY_COLORS.edge[2] * e)

    fr.rig.jointWorld('chest', scratch.p)
    light.position.copy(scratch.p)
    light.intensity = f.reveal * (0.6 + f.energy * 5)

    // Light trails on the limbs and a scarf of light from the back of the neck.
    const speed = engine.derived.velocitySpeed
    const show = f.reveal > 0.05
    const trailOpacity = f.trails * f.reveal * smoothstep(1.5, 9, speed)
    TRAILED.forEach((j, i) => {
      fr.rig.jointWorld(j, scratch.p)
      const t = trails.limbs[i]
      if (!scratch.visible && show) t.reset(scratch.p)
      else t.push(scratch.p)
      t.setOpacity(trailOpacity)
      t.setResolution(size.width * dpr, size.height * dpr)
    })
    fr.rig.jointWorld('neck', scratch.scarf)
    scratch.back.set(0, 0.05, -0.12).applyQuaternion(fr.outer.quaternion)
    scratch.scarf.add(scratch.back)
    if (!scratch.visible && show) trails.scarf.reset(scratch.scarf)
    else trails.scarf.push(scratch.scarf)
    trails.scarf.setOpacity(f.reveal * (0.15 + 0.85 * smoothstep(0.5, 6, speed)) * Math.max(f.trails, 0.35))
    trails.scarf.setResolution(size.width * dpr, size.height * dpr)
    scratch.visible = show

    // Afterimages at impossible speed.
    ghosts.setResolution(size.width * dpr, size.height * dpr)
    if (f.trails > 0.5 && speed > 10 && engine.elapsed - scratch.lastGhost >= 1 / GHOST_RATE) {
      scratch.lastGhost = engine.elapsed
      ghosts.capture(fr.rig, engine.elapsed)
    }
  }, FRAME_STAGE.WORLD)

  return (
    <>
      <primitive object={batch.group} dispose={null} />
      <primitive object={light} dispose={null} />
      {trails.limbs.map((t, i) => (
        <primitive key={i} name="velocity-trails" object={t.mesh} dispose={null} />
      ))}
      <primitive name="velocity-trails" object={trails.scarf.mesh} dispose={null} />
      <primitive name="velocity-ghosts" object={ghosts.mesh} dispose={null} />
      <CodeCore rig={fr.rig} />
    </>
  )
}
