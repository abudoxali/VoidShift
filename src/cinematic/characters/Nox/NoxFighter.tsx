import { useFrame } from '@react-three/fiber'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight, Vector3 } from 'three'
import { CharacterRig } from '../../animation/CharacterRig'
import { NOX_POSES } from '../../animation/poses/noxPoses'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { FRAME_STAGE } from '../../engine/frameStages'
import { useWorld } from '../../scenes/WorldContext'
import { useExperience } from '../../../store/experienceStore'
import { hash1 } from '../../../utils/math'
import { disposeGeometries } from '../bodyParts'
import { ClothStrips, type Collider } from '../cloth/ClothStrips'
import { createFighterUniforms, withDissolve } from '../fighterMaterials'
import { RigidBatch } from '../RigidBatch'
import { FIGHTER_RIGS } from '../registry'
import { SkeletonLines } from '../SkeletonLines'
import { PIVOT_HEIGHT, driveFighter, useFighterRigObject } from '../useFighterRig'
import { NOX_COLORS, NOX_PROPORTIONS, buildNoxBody } from './buildNoxBody'

const VIOLET = new Color(...NOX_COLORS.violet)
const CRIMSON = new Color(...NOX_COLORS.crimson)
const EYE = new Color(...NOX_COLORS.eye)

/**
 * NOX (engine id `void`). Heavy, planted, cloaked. While he phases, his fractured plates jump to
 * contradictory positions and a translucent echo of his body appears beside him. The cloak
 * strips answer every turn and stop.
 */
export function NoxFighter() {
  const engine = useCinematicEngine()
  const { profile } = useWorld()
  const camera = useThree((s) => s.camera)
  const fr = useFighterRigObject(NOX_PROPORTIONS)
  const uniforms = useMemo(() => createFighterUniforms(NOX_COLORS.dissolve), [])
  const body = useMemo(() => buildNoxBody(fr.rig, uniforms, NOX_PROPORTIONS), [fr, uniforms])
  const batch = useMemo(() => new RigidBatch(fr.outer, 'void', body.materials), [fr, body])
  useEffect(() => {
    FIGHTER_RIGS.void = fr.rig
    return () => void (FIGHTER_RIGS.void = null)
  }, [fr])

  // Echo: the same body at a conflicting position, drawn as one translucent violet pass.
  const echo = useMemo(() => {
    const rig = new CharacterRig(NOX_PROPORTIONS)
    const ghost = new MeshBasicMaterial({ color: new Color(0.35, 0.12, 0.7), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })
    const b = buildNoxBody(rig, createFighterUniforms(NOX_COLORS.dissolve), NOX_PROPORTIONS)
    Object.values(b.materials).forEach((m) => m.dispose())
    rig.root.traverse((o) => {
      if ((o as Mesh).isMesh) (o as Mesh).material = ghost
    })
    rig.root.position.y = -PIVOT_HEIGHT
    const outer = new Group()
    outer.add(rig.root)
    return { rig, outer, ghost, batch: new RigidBatch(outer, 'void-echo') }
  }, [])

  useEffect(
    () => () => {
      batch.dispose()
      echo.batch.dispose()
      disposeGeometries(fr.outer)
      disposeGeometries(echo.rig.root)
      Object.values(body.materials).forEach((m) => m.dispose())
      echo.ghost.dispose()
    },
    [fr, body, batch, echo],
  )

  // Cloak: six strips from the mantle's back edge; heavier and slower than AERON's scarf.
  const cloak = useMemo(() => {
    const mat = withDissolve(new MeshStandardMaterial({ color: NOX_COLORS.cloak, roughness: 0.8, side: DoubleSide, emissive: new Color(0x0a0410) }), uniforms, 'nox-cloak-strips')
    const xs = [-0.26, -0.15, -0.05, 0.05, 0.15, 0.26]
    const strips = new ClothStrips(
      xs.map((x, i) => ({
        anchor: fr.rig.joints.chest,
        offset: new Vector3(x, 0.08 - Math.abs(x) * 0.25, -0.14 + Math.abs(x) * 0.12),
        length: 0.95 + (i % 2) * 0.12 - Math.abs(x) * 0.6,
        segments: 10,
        width: 0.13,
        tipWidth: 0.55,
        rest: new Vector3(x * 0.6, -1, -0.25),
      })),
      mat,
    )
    strips.drag = 2.2
    strips.stiffness = 5
    return { strips, mat }
  }, [fr, uniforms])
  useEffect(
    () => () => {
      cloak.strips.dispose()
      cloak.mat.dispose()
    },
    [cloak],
  )

  const skeleton = useMemo(() => new SkeletonLines([1.4, 0.4, 2.0]), [])
  useEffect(() => () => skeleton.dispose(), [skeleton])

  const light = useMemo(() => new PointLight(new Color(0.75, 0.3, 1.0), 0, 5, 2), [])
  const scratch = useMemo(
    () => ({ p: new Vector3(), key: new Vector3(), settled: false, colliders: [{ center: new Vector3(), radius: 0.26 }, { center: new Vector3(), radius: 0.22 }, { center: new Vector3(), radius: 0.2 }] as Collider[] }),
    [],
  )
  useEffect(() => engine.on('seek', () => void (scratch.settled = false)), [engine, scratch])

  useFrame(() => {
    const f = engine.state.fighters.void
    const { skeletonDebug } = useExperience.getState()
    driveFighter(f, fr, NOX_POSES, NOX_POSES.guard, engine)
    uniforms.uReveal.value = f.reveal
    const t = engine.elapsed
    const ph = f.phase

    body.hands.L.fist.userData.batchHidden = fr.rig.handL !== 'fist'
    body.hands.L.open.userData.batchHidden = fr.rig.handL === 'fist'
    body.hands.R.fist.userData.batchHidden = fr.rig.handR !== 'fist'
    body.hands.R.open.userData.batchHidden = fr.rig.handR === 'fist'

    const e = 0.5 + f.energy * 0.8 + ph * 0.8
    body.materials.violet.emissive.copy(VIOLET).multiplyScalar(e)
    body.materials.crimson.emissive.copy(CRIMSON).multiplyScalar(0.6 + f.energy * 0.6 + ph)
    body.materials.eye.emissive.copy(EYE).multiplyScalar(0.75 + f.energy * 0.3 + ph * 0.6)

    // Phase: the fractured plates jump to contradictory positions, flickering at 14 Hz.
    const tq = Math.floor(t * 14 * Math.max(engine.motion.ambient, 0.4))
    for (const part of body.phaseParts) {
      const on = hash1(part.seed * 97 + tq) < 0.65 ? 1 : 0.35
      const amt = ph * (0.06 + part.seed * 0.16) * on
      part.object.position.copy(part.base).addScaledVector(part.dir, amt)
    }
    body.shards.children.forEach((s) => {
      const d = s.userData as { radius: number; angle: number; height: number; speed: number; tilt: number }
      const a = d.angle + t * d.speed * engine.motion.ambient
      const r = d.radius * (1 + ph * 0.6)
      s.position.set(Math.cos(a) * r, d.height + Math.sin(a * 2 + d.tilt) * 0.04, Math.sin(a) * r * 0.7)
      s.rotation.set(d.tilt + t * 0.7, a, 0)
    })
    batch.update(fr.outer.visible)

    // Echo at a conflicting position.
    const echoOn = ph > 0.02 && f.reveal > 0.5
    if (echoOn) {
      const side = hash1(tq * 3.1) < 0.5 ? -1 : 1
      echo.outer.position.copy(fr.outer.position)
      echo.outer.rotation.copy(fr.outer.rotation)
      echo.outer.translateX((0.3 + 0.2 * hash1(tq * 7.7)) * side * ph)
      echo.rig.apply(NOX_POSES[f.from as keyof typeof NOX_POSES] ?? NOX_POSES.guard, NOX_POSES[f.pose as keyof typeof NOX_POSES] ?? NOX_POSES.guard, f.blend, { time: t, breath: 0, jitter: ph })
      echo.ghost.opacity = ph * (profile.tier === 'LITE' ? 0.22 : 0.32)
    }
    echo.batch.update(echoOn)

    skeleton.update(fr.rig, skeletonDebug ? 1 : 0)

    fr.rig.jointWorld('neck', scratch.p)
    light.position.copy(scratch.p).add(scratch.key.set(-0.2, 0.2, 0.8).applyQuaternion(fr.outer.quaternion))
    light.intensity = f.reveal * (0.45 + f.energy * 0.5 + ph * 1.2)

    const dt = engine.playing ? engine.dt * engine.timeScale : 0
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
    cloak.strips.mesh.visible = f.reveal > 0.02
  }, FRAME_STAGE.WORLD)

  return (
    <>
      <primitive object={batch.group} dispose={null} />
      <primitive object={echo.batch.group} dispose={null} />
      <primitive object={light} dispose={null} />
      <primitive name="void-cloth" object={cloak.strips.mesh} dispose={null} />
      <primitive name="void-skeleton" object={skeleton.lines} dispose={null} />
    </>
  )
}
