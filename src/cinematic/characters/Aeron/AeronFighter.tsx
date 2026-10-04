import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, DoubleSide, MeshBasicMaterial, MeshStandardMaterial, PointLight, Vector3 } from 'three'
import { AERON_POSES } from '../../animation/poses/aeronPoses'
import type { JointName } from '../../animation/skeleton'
import { CodeCore } from '../../effects/energy/CodeCore'
import { PoseGhosts } from '../../effects/trails/PoseGhosts'
import { VectorTrail } from '../../effects/trails/VectorTrail'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { FRAME_STAGE } from '../../engine/frameStages'
import { useWorld } from '../../scenes/WorldContext'
import { useExperience } from '../../../store/experienceStore'
import { smoothstep } from '../../../utils/math'
import { ClothStrips, type Collider } from '../cloth/ClothStrips'
import { createBodyScratch, driveBody, useSculptedBody } from '../fighterBody'
import { FIGHTER_RIGS } from '../registry'
import { SkeletonLines } from '../SkeletonLines'
import { driveFighter, useFighterRigObject } from '../useFighterRig'
import { AERON_PROPORTIONS } from './aeronDesign'

// The striking hand and the kicking foot only: more trails would bury the silhouette.
const TRAILED: JointName[] = ['handR', 'footL']
const GHOST_RATE = 30
const KEY_DIR = new Vector3(-0.5, 0.75, 0.6).normalize()
const RIM_DIR = new Vector3(-0.4, 0.6, -1).normalize()

/**
 * AERON (engine id `velocity`). A sculpted, skinned body on the posed, IK-planted rig, with an
 * energy scarf and a waist sash that answer his motion, limb trails only at real speed, an
 * energy skeleton that leads every reconstruction, a face/key light, and the Code Core.
 */
export function AeronFighter() {
  const engine = useCinematicEngine()
  const { uniforms: world, profile } = useWorld()
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)
  const camera = useThree((s) => s.camera)
  const fr = useFighterRigObject(AERON_PROPORTIONS)
  const body = useSculptedBody('aeron', fr, profile.tier)
  useEffect(() => {
    FIGHTER_RIGS.velocity = fr.rig
    return () => void (FIGHTER_RIGS.velocity = null)
  }, [fr])

  // Secondary motion: the energy scarf (from the back of the neck) and the waist sash.
  const cloth = useMemo(() => {
    const scarfMat = new MeshBasicMaterial({ color: new Color(0.16, 0.8, 1.1), vertexColors: true, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })
    const scarf = new ClothStrips(
      [
        { anchor: fr.rig.joints.neck, offset: new Vector3(0.05, 0.05, -0.07), length: 1.35, segments: 20, width: 0.07, tipWidth: 0.28, facing: 'camera', rest: new Vector3(0.1, -0.5, -1) },
        { anchor: fr.rig.joints.neck, offset: new Vector3(-0.05, 0.04, -0.07), length: 0.95, segments: 14, width: 0.05, tipWidth: 0.22, facing: 'camera', rest: new Vector3(-0.1, -0.6, -1) },
      ],
      scarfMat,
      { gradient: true },
    )
    scarf.drag = 2.4
    scarf.gravityScale = 0.3
    const sashMat = new MeshStandardMaterial({ color: 0x0b1418, roughness: 0.8, side: DoubleSide, emissive: new Color(0x021014) })
    const sash = new ClothStrips(
      [
        { anchor: fr.rig.joints.hips, offset: new Vector3(0.13, 0.02, -0.07), length: 0.46, segments: 8, width: 0.09, tipWidth: 0.6, rest: new Vector3(0.3, -1, -0.4) },
        { anchor: fr.rig.joints.hips, offset: new Vector3(0.08, 0.01, -0.1), length: 0.36, segments: 7, width: 0.07, tipWidth: 0.5, rest: new Vector3(0.1, -1, -0.5) },
      ],
      sashMat,
    )
    sash.drag = 1.8
    return { scarf, sash, scarfMat, sashMat }
  }, [fr])
  useEffect(
    () => () => {
      cloth.scarf.dispose()
      cloth.sash.dispose()
      cloth.scarfMat.dispose()
      cloth.sashMat.dispose()
    },
    [cloth],
  )

  const skeleton = useMemo(() => new SkeletonLines([0.5, 1.9, 2.5]), [])
  useEffect(() => () => skeleton.dispose(), [skeleton])

  const light = useMemo(() => new PointLight(new Color(0.55, 0.95, 1.0), 0, 6, 2), [])

  const trails = useMemo(() => {
    const len = Math.max(14, Math.round(profile.trailLength * 0.3))
    return TRAILED.map(() => new VectorTrail({ length: len, width: 3.5, color: [0.4, 1.4, 2.0] }))
  }, [profile.trailLength])
  useEffect(() => () => trails.forEach((t) => t.dispose()), [trails])

  const ghosts = useMemo(() => new PoseGhosts(6, world, [0.35, 1.1, 1.7], 2.5, 0.22), [world])
  useEffect(() => () => ghosts.dispose(), [ghosts])

  const scratch = useMemo(
    () => ({
      p: new Vector3(),
      key: new Vector3(),
      look: new Vector3(),
      settled: false,
      visible: false,
      lastGhost: -1,
      body: createBodyScratch(),
      colliders: [{ center: new Vector3(), radius: 0.21 }, { center: new Vector3(), radius: 0.18 }, { center: new Vector3(), radius: 0.16 }] as Collider[],
    }),
    [],
  )
  useEffect(
    () =>
      engine.on('seek', () => {
        ghosts.clear()
        scratch.visible = false
        scratch.settled = false
        scratch.body.valid = false
      }),
    [engine, ghosts, scratch, cloth],
  )

  useFrame(() => {
    const f = engine.state.fighters.velocity
    const { fx, skeletonDebug } = useExperience.getState()
    const fxOn = fx === 'full'
    driveFighter(f, fr, AERON_POSES, AERON_POSES.guard, engine)
    const dt = engine.playing ? engine.dt * engine.timeScale : 0
    if (body) {
      // Eyes on NOX (his head), or on the anchor while it flies.
      const nox = FIGHTER_RIGS.void
      const look = engine.state.anchor.visible > 0.5 && engine.state.anchor.held < 0.5 ? scratch.look.copy(engine.state.anchor.position) : nox ? nox.jointWorld('head', scratch.look) : null
      driveBody(body, f, fr, { time: engine.elapsed, dt, camera, lookAt: look, seed: 0, glow: fxOn ? 1 : 0.7, rimStrength: 0.25 + engine.state.lights.rimVelocity * 0.55, rimDir: RIM_DIR, keyDir: KEY_DIR }, scratch.body)
    }

    // Energy skeleton: leads the reconstruction (visible before the body), and review debug.
    const lead = smoothstep(0.0, 0.08, f.reveal) * (1 - smoothstep(0.35, 0.75, f.reveal))
    skeleton.update(fr.rig, skeletonDebug ? 1 : lead * 1.4)

    // Key light on the face and chest.
    fr.rig.jointWorld('neck', scratch.p)
    light.position.copy(scratch.p).add(scratch.key.set(0.3, 0.3, 0.9).applyQuaternion(fr.outer.quaternion))
    light.intensity = f.reveal * (0.25 + f.energy * 0.6)

    // Cloth.
    fr.rig.jointWorld('chest', scratch.colliders[0].center)
    fr.rig.jointWorld('hips', scratch.colliders[1].center)
    fr.rig.jointWorld('spine', scratch.colliders[2].center)
    if (dt === 0 && !scratch.settled) {
      // Paused / seeked: let the cloth hang naturally around the current pose once.
      cloth.scarf.reset()
      cloth.sash.reset()
      scratch.settled = true
    }
    if (dt > 0) scratch.settled = false
    cloth.scarf.step(dt, scratch.colliders)
    cloth.sash.step(dt, scratch.colliders)
    // The scarf snaps in last on a reconstruction.
    cloth.scarf.write(camera, smoothstep(0.82, 1, f.reveal))
    cloth.scarf.mesh.visible = f.reveal > 0.82 && f.phase < 0.5
    cloth.sash.write(camera, 1)
    cloth.sash.mesh.visible = f.reveal > 0.3

    // Limb trails: only at real speed, short, fading fast; and afterimages at extreme speed.
    const speed = engine.derived.velocitySpeed
    const show = f.reveal > 0.05
    const trailOpacity = fxOn ? f.trails * f.reveal * smoothstep(3, 10, speed) : 0
    TRAILED.forEach((j, i) => {
      fr.rig.jointWorld(j, scratch.p)
      const t = trails[i]
      if (!scratch.visible && show) t.reset(scratch.p)
      else t.push(scratch.p)
      t.setOpacity(trailOpacity)
      t.mesh.visible = trailOpacity > 0.002
      t.setResolution(size.width * dpr, size.height * dpr)
    })
    scratch.visible = show
    ghosts.setResolution(size.width * dpr, size.height * dpr)
    ghosts.mesh.visible = fxOn
    if (fxOn && f.trails > 0.5 && speed > 12 && engine.elapsed - scratch.lastGhost >= 1 / GHOST_RATE) {
      scratch.lastGhost = engine.elapsed
      ghosts.capture(fr.rig, engine.elapsed)
    }
  }, FRAME_STAGE.WORLD)

  return (
    <>
      <primitive name="velocity" object={fr.outer} dispose={null} />
      <primitive object={light} dispose={null} />
      <primitive name="velocity-cloth" object={cloth.scarf.mesh} dispose={null} />
      <primitive name="velocity-cloth" object={cloth.sash.mesh} dispose={null} />
      <primitive name="velocity-skeleton" object={skeleton.lines} dispose={null} />
      {trails.map((t, i) => (
        <primitive key={i} name="velocity-trails" object={t.mesh} dispose={null} />
      ))}
      <primitive name="velocity-ghosts" object={ghosts.mesh} dispose={null} />
      <CodeCore rig={fr.rig} />
    </>
  )
}
