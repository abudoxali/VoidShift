import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, LineBasicMaterial, LineSegments, Mesh, PointLight, Vector3 } from 'three'
import { CharacterRig } from '../../animation/CharacterRig'
import { VOID_POSES, VOID_PROPORTIONS } from '../../animation/poses/voidPoses'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { FRAME_STAGE } from '../../engine/frameStages'
import { useWorld } from '../../scenes/WorldContext'
import { hash1 } from '../../../utils/math'
import { createFighterUniforms } from '../fighterMaterials'
import { disposeGeometries } from '../bodyParts'
import { PIVOT_HEIGHT, driveFighter, useFighterRigObject } from '../useFighterRig'
import { VOID_COLORS, buildVoidBody } from './buildVoidBody'

const VIOLET = new Color(...VOID_COLORS.violet)
const CRIMSON = new Color(...VOID_COLORS.crimson)

/**
 * VOID — the unnatural fighter. While phased its body separates into contradictory positions:
 * parts jump along random axes, an echo of the whole body flickers beside it, the cloak splays
 * and the distortion field (post-processing) tears the image around it.
 */
export function VoidFighter() {
  const engine = useCinematicEngine()
  const { profile } = useWorld()
  const fr = useFighterRigObject(VOID_PROPORTIONS)
  const uniforms = useMemo(() => createFighterUniforms(VOID_COLORS.dissolve), [])
  const body = useMemo(() => buildVoidBody(fr.rig, uniforms, VOID_PROPORTIONS), [fr, uniforms])

  // Echo: a second, edges-only body sharing the pose — the same fighter at a conflicting position.
  const echo = useMemo(() => {
    const rig = new CharacterRig(VOID_PROPORTIONS)
    const echoUniforms = createFighterUniforms(VOID_COLORS.dissolve)
    const b = buildVoidBody(rig, echoUniforms, VOID_PROPORTIONS)
    const ghost = new LineBasicMaterial({ color: new Color(0.6, 0.25, 1.3), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })
    rig.root.traverse((o) => {
      if (o instanceof LineSegments) o.material = ghost
      else if (o instanceof Mesh) o.material.visible = false
    })
    Object.values(b.materials).forEach((m) => (m.visible = false))
    rig.root.position.y = -PIVOT_HEIGHT
    return { rig, body: b, ghost, materials: b.materials }
  }, [])
  const echoOuter = useMemo(() => {
    const g = fr.outer.clone(false)
    g.add(echo.rig.root)
    return g
  }, [fr, echo])

  useEffect(
    () => () => {
      disposeGeometries(fr.outer)
      disposeGeometries(echo.rig.root)
      Object.values(body.materials).forEach((m) => m.dispose())
      Object.values(echo.materials).forEach((m) => m.dispose())
      echo.ghost.dispose()
    },
    [fr, body, echo],
  )

  const light = useMemo(() => new PointLight(new Color(0.55, 0.2, 1.0), 0, 5, 2), [])
  const scratch = useMemo(() => ({ p: new Vector3(), prev: new Vector3(), vel: new Vector3(), local: new Vector3(), init: false }), [])

  useFrame(() => {
    const f = engine.state.fighters.void
    driveFighter(f, fr, VOID_POSES, VOID_POSES.stand, engine)
    uniforms.uReveal.value = f.reveal
    const t = engine.elapsed
    const ph = f.phase

    const e = 0.5 + f.energy * 0.8 + ph * 0.8
    body.materials.violet.color.copy(VIOLET).multiplyScalar(e)
    body.materials.crimson.color.copy(CRIMSON).multiplyScalar(0.6 + f.energy * 0.6 + ph)

    // Phase: parts jump to contradictory positions, flickering at 14 Hz.
    const tq = Math.floor(t * 14 * Math.max(engine.motion.ambient, 0.4))
    for (const part of body.phaseParts) {
      const on = hash1(part.seed * 97 + tq) < 0.65 ? 1 : 0.35
      const amt = ph * (0.08 + part.seed * 0.22) * on
      part.object.position.copy(part.base).addScaledVector(part.dir, amt)
    }

    // Cloak: lags behind the body's motion, splays while phased.
    if (!scratch.init) {
      scratch.prev.copy(f.position)
      scratch.init = true
    }
    const dt = Math.max(engine.dt, 1e-4)
    scratch.vel.subVectors(f.position, scratch.prev).divideScalar(dt)
    scratch.prev.copy(f.position)
    scratch.local.copy(scratch.vel).applyAxisAngle(UP, -f.yaw)
    body.panels.forEach((p, i) => {
      const sway = Math.sin(t * 1.3 + i * 1.7) * 0.05
      p.rotation.x = Math.min(1.2, Math.max(-0.4, scratch.local.z * 0.12)) + sway + ph * 0.5
      p.rotation.z = Math.max(-0.6, Math.min(0.6, -scratch.local.x * 0.08)) + ph * (i % 2 ? 0.4 : -0.4)
    })
    // Shards orbit the shoulders, wider while phased.
    body.shards.children.forEach((s) => {
      const d = s.userData as { radius: number; angle: number; height: number; speed: number; tilt: number }
      const a = d.angle + t * d.speed * engine.motion.ambient
      const r = d.radius * (1 + ph * 0.8)
      s.position.set(Math.cos(a) * r, d.height + Math.sin(a * 2 + d.tilt) * 0.05, Math.sin(a) * r * 0.7)
      s.rotation.set(d.tilt + t * 0.7, a, 0)
    })

    // Echo at a conflicting position.
    echoOuter.visible = ph > 0.02 && f.reveal > 0.5
    if (echoOuter.visible) {
      const side = hash1(tq * 3.1) < 0.5 ? -1 : 1
      const off = (0.35 + 0.25 * hash1(tq * 7.7)) * side * ph
      echoOuter.position.copy(fr.outer.position)
      echoOuter.rotation.copy(fr.outer.rotation)
      echoOuter.translateX(off)
      echo.rig.apply(VOID_POSES[f.from as keyof typeof VOID_POSES] ?? VOID_POSES.stand, VOID_POSES[f.pose as keyof typeof VOID_POSES] ?? VOID_POSES.stand, f.blend, { time: t, breath: 0, jitter: ph })
      echo.ghost.opacity = ph * (profile.tier === 'LITE' ? 0.5 : 0.8)
    }

    fr.rig.jointWorld('chest', scratch.p)
    light.position.copy(scratch.p)
    light.intensity = f.reveal * (0.4 + f.energy * 1.5 + ph * 3)
  }, FRAME_STAGE.WORLD)

  return (
    <>
      <primitive object={fr.outer} dispose={null} />
      <primitive object={echoOuter} dispose={null} />
      <primitive object={light} dispose={null} />
    </>
  )
}

const UP = new Vector3(0, 1, 0)
