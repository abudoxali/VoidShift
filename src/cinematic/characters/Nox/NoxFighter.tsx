import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, DoubleSide, Group, MeshBasicMaterial, MeshStandardMaterial, PointLight, Skeleton, SkinnedMesh, Vector3 } from 'three'
import { CharacterRig } from '../../animation/CharacterRig'
import { NOX_POSES } from '../../animation/poses/noxPoses'
import { JOINTS } from '../../animation/skeleton'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { FRAME_STAGE } from '../../engine/frameStages'
import { useWorld } from '../../scenes/WorldContext'
import { useExperience } from '../../../store/experienceStore'
import { hash1 } from '../../../utils/math'
import { ClothStrips, type Collider } from '../cloth/ClothStrips'
import { createBodyScratch, driveBody, useSculptedBody } from '../fighterBody'
import { FIGHTER_RIGS } from '../registry'
import { applyBindPose } from '../sculpt/frames'
import { SkeletonLines } from '../SkeletonLines'
import { PIVOT_HEIGHT, driveFighter, useFighterRigObject } from '../useFighterRig'
import { NOX_PROPORTIONS } from './noxDesign'

const KEY_DIR = new Vector3(0.45, 0.7, 0.6).normalize()
const RIM_DIR = new Vector3(0.5, 0.6, -1).normalize()

/**
 * NOX (engine id `void`). Heavy, planted, cloaked, sculpted. While he phases his body splits into
 * displaced slices (material) and a translucent violet echo of his body stands beside him at a
 * contradictory position. The cloak strips answer every turn and stop.
 */
export function NoxFighter() {
  const engine = useCinematicEngine()
  const { profile } = useWorld()
  const camera = useThree((s) => s.camera)
  const fr = useFighterRigObject(NOX_PROPORTIONS)
  const body = useSculptedBody('nox', fr, profile.tier)
  useEffect(() => {
    FIGHTER_RIGS.void = fr.rig
    return () => void (FIGHTER_RIGS.void = null)
  }, [fr])

  // Echo: his body geometry on a second rig, one additive violet draw.
  const echo = useMemo(() => {
    if (!body) return null
    const rig = new CharacterRig(NOX_PROPORTIONS)
    rig.root.position.y = -PIVOT_HEIGHT
    const outer = new Group()
    outer.add(rig.root)
    applyBindPose(rig)
    outer.updateMatrixWorld(true)
    const skeleton = new Skeleton(JOINTS.map((j) => rig.joints[j]))
    const ghost = new MeshBasicMaterial({ color: new Color(0.35, 0.12, 0.7), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })
    const mesh = new SkinnedMesh(body.geometry.body, ghost)
    mesh.frustumCulled = false
    mesh.bind(skeleton, rig.root.matrixWorld)
    rig.root.add(mesh)
    return { rig, outer, ghost, skeleton }
  }, [body])
  useEffect(
    () => () => {
      if (!echo) return
      echo.ghost.dispose()
      echo.skeleton.dispose()
    },
    [echo],
  )

  // Cloak: six strips from the mantle's back edge; heavier and slower than AERON's scarf.
  const cloak = useMemo(() => {
    const mat = new MeshStandardMaterial({ color: 0x0b0810, roughness: 0.85, side: DoubleSide, emissive: new Color(0x06020a) })
    const xs = [-0.28, -0.17, -0.06, 0.06, 0.17, 0.28]
    const strips = new ClothStrips(
      xs.map((x, i) => ({
        anchor: fr.rig.joints.chest,
        offset: new Vector3(x, 0.12 - Math.abs(x) * 0.2, -0.17 + Math.abs(x) * 0.1),
        length: 1.05 + (i % 2) * 0.12 - Math.abs(x) * 0.5,
        segments: 11,
        width: 0.15,
        tipWidth: 0.6,
        rest: new Vector3(x * 0.6, -1, -0.25),
      })),
      mat,
    )
    strips.drag = 2.2
    strips.stiffness = 5
    return { strips, mat }
  }, [fr])
  useEffect(
    () => () => {
      cloak.strips.dispose()
      cloak.mat.dispose()
    },
    [cloak],
  )

  const skeleton = useMemo(() => new SkeletonLines([1.4, 0.4, 2.0]), [])
  useEffect(() => () => skeleton.dispose(), [skeleton])

  const light = useMemo(() => new PointLight(new Color(0.72, 0.46, 0.95), 0, 5, 2), [])
  const scratch = useMemo(
    () => ({
      p: new Vector3(),
      key: new Vector3(),
      look: new Vector3(),
      settled: false,
      body: createBodyScratch(),
      colliders: [{ center: new Vector3(), radius: 0.28 }, { center: new Vector3(), radius: 0.24 }, { center: new Vector3(), radius: 0.22 }] as Collider[],
    }),
    [],
  )
  useEffect(
    () =>
      engine.on('seek', () => {
        scratch.settled = false
        scratch.body.valid = false
      }),
    [engine, scratch],
  )

  useFrame(() => {
    const f = engine.state.fighters.void
    const { fx, skeletonDebug } = useExperience.getState()
    driveFighter(f, fr, NOX_POSES, NOX_POSES.guard, engine)
    const t = engine.elapsed
    const ph = f.phase
    const dt = engine.playing ? engine.dt * engine.timeScale : 0
    if (body) {
      // Eyes on AERON; on the anchor while it is in flight past him.
      const aeron = FIGHTER_RIGS.velocity
      const a = engine.state.anchor
      const look = a.visible > 0.5 && a.held < 0.5 && a.planted < 0.5 ? scratch.look.copy(a.position) : aeron && engine.state.fighters.velocity.reveal > 0.3 ? aeron.jointWorld('head', scratch.look) : null
      driveBody(body, f, fr, { time: t, dt, camera, lookAt: look, seed: 2, glow: fx === 'full' ? 1 : 0.7, rimStrength: 0.12 + engine.state.lights.rimVoid * 0.3, rimDir: RIM_DIR, keyDir: KEY_DIR }, scratch.body)
    }

    // Echo at a conflicting position.
    if (echo) {
      const echoOn = fx === 'full' && ph > 0.02 && f.reveal > 0.5
      echo.outer.visible = echoOn
      if (echoOn) {
        const tq = Math.floor(t * 14 * Math.max(engine.motion.ambient, 0.4))
        const side = hash1(tq * 3.1) < 0.5 ? -1 : 1
        echo.outer.position.copy(fr.outer.position)
        echo.outer.rotation.copy(fr.outer.rotation)
        echo.outer.translateX((0.3 + 0.2 * hash1(tq * 7.7)) * side * ph)
        echo.rig.apply(NOX_POSES[f.from as keyof typeof NOX_POSES] ?? NOX_POSES.guard, NOX_POSES[f.pose as keyof typeof NOX_POSES] ?? NOX_POSES.guard, f.blend, { time: t, breath: 0, jitter: ph })
        echo.outer.updateMatrixWorld(true)
        echo.ghost.opacity = ph * (profile.tier === 'LITE' ? 0.08 : 0.11)
      }
    }

    skeleton.update(fr.rig, skeletonDebug ? 1 : 0)

    fr.rig.jointWorld('neck', scratch.p)
    light.position.copy(scratch.p).add(scratch.key.set(-0.2, 0.2, 0.8).applyQuaternion(fr.outer.quaternion))
    light.intensity = f.reveal * (0.45 + f.energy * 0.5 + ph * 1.2)

    fr.rig.jointWorld('chest', scratch.colliders[0].center)
    fr.rig.jointWorld('spine', scratch.colliders[1].center)
    fr.rig.jointWorld('hips', scratch.colliders[2].center)
    if (dt === 0 && !scratch.settled) {
      cloak.strips.reset()
      scratch.settled = true
    }
    if (dt > 0) scratch.settled = false
    cloak.strips.step(dt, scratch.colliders)
    cloak.strips.write(camera, 1)
    cloak.strips.mesh.visible = f.reveal > 0.3
  }, FRAME_STAGE.WORLD)

  return (
    <>
      <primitive name="void" object={fr.outer} dispose={null} />
      {echo && <primitive name="void-echo" object={echo.outer} dispose={null} />}
      <primitive object={light} dispose={null} />
      <primitive name="void-cloth" object={cloak.strips.mesh} dispose={null} />
      <primitive name="void-skeleton" object={skeleton.lines} dispose={null} />
    </>
  )
}
