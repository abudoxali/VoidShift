import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, DirectionalLight, GridHelper, HemisphereLight, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, PointLight, Quaternion, SpotLight, Vector3, type PerspectiveCamera } from 'three'
import { CharacterRig } from '../cinematic/animation/CharacterRig'
import { FIGHTER_KITS } from '../cinematic/characters/designs'
import { applyExpression, blinkAt } from '../cinematic/characters/sculpt/expressions'
import type { CharacterGeometry } from '../cinematic/characters/sculpt/generate'
import { useCharacterGeometry } from '../cinematic/characters/sculpt/loader'
import { SculptedFighter } from '../cinematic/characters/sculpt/SculptedFighter'
import { SkeletonLines } from '../cinematic/characters/SkeletonLines'
import { LabPanel } from './LabPanel'
import { useLab, type LabView } from './labStore'

/** Camera per view: [azimuth (rad, 0 = front), elevation, distance, target y]. */
const VIEWS: Record<LabView, [number, number, number, number]> = {
  front: [0, 0.05, 3.6, 0.95],
  'three-quarter': [0.62, 0.08, 3.6, 0.95],
  side: [Math.PI / 2, 0.05, 3.6, 0.95],
  back: [Math.PI, 0.1, 3.6, 0.95],
  face: [0.0, 0.02, 0.62, 1.56],
  'face-34': [0.55, 0.04, 0.68, 1.56],
  hands: [0.9, -0.1, 1.3, 0.85],
}

function LabCamera() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const orbit = useRef({ az: 0.62, el: 0.08, dist: 3.6, ty: 0.95, dragging: false, x: 0, y: 0 })
  const view = useLab((s) => s.view)
  useEffect(() => {
    const [az, el, dist, ty] = VIEWS[view]
    Object.assign(orbit.current, { az, el, dist, ty })
  }, [view])
  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => Object.assign(orbit.current, { dragging: true, x: e.clientX, y: e.clientY })
    const move = (e: PointerEvent) => {
      const o = orbit.current
      if (!o.dragging) return
      o.az -= (e.clientX - o.x) * 0.008
      o.el = Math.max(-0.6, Math.min(1.2, o.el + (e.clientY - o.y) * 0.006))
      o.x = e.clientX
      o.y = e.clientY
    }
    const up = () => (orbit.current.dragging = false)
    const wheel = (e: WheelEvent) => {
      orbit.current.dist = Math.max(0.3, Math.min(8, orbit.current.dist * (1 + Math.sign(e.deltaY) * 0.08)))
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    el.addEventListener('wheel', wheel, { passive: true })
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])
  useFrame((_, dt) => {
    const o = orbit.current
    if (useLab.getState().turntable && !o.dragging) o.az += dt * 0.4
    camera.position.set(Math.sin(o.az) * Math.cos(o.el) * o.dist, o.ty + Math.sin(o.el) * o.dist, Math.cos(o.az) * Math.cos(o.el) * o.dist)
    camera.lookAt(0, o.ty, 0)
    camera.fov = 30
    camera.near = 0.02
    camera.updateProjectionMatrix()
  })
  return null
}

function LabLights() {
  const light = useLab((s) => s.light)
  const fighter = useLab((s) => s.fighter)
  const rig = useMemo(() => {
    const hemi = new HemisphereLight(new Color(0.3, 0.42, 0.5), new Color(0.02, 0.025, 0.03), 0.5)
    const key = new DirectionalLight(new Color(0.85, 0.92, 1.0), 2)
    key.position.set(-2, 3, 4)
    const fill = new DirectionalLight(new Color(0.5, 0.6, 0.75), 0.4)
    fill.position.set(3, 1, 2)
    const rim = new SpotLight(new Color(0.4, 0.9, 1.1), 30, 0, 0.35, 0.6, 0)
    rim.position.set(1.5, 3.5, -4)
    const rimTarget = new Object3D()
    rimTarget.position.set(0, 1.2, 0)
    rim.target = rimTarget
    const rim2 = new SpotLight(new Color(0.4, 0.9, 1.1), 20, 0, 0.35, 0.6, 0)
    rim2.position.set(-2, 3, -3.5)
    rim2.target = rimTarget
    const core = new PointLight(new Color(0.5, 1.2, 1.5), 0, 4, 2)
    core.position.set(0.35, 1.25, 0.45)
    return { hemi, key, fill, rim, rim2, rimTarget, core }
  }, [])
  useEffect(() => {
    const c = fighter === 'nox' ? new Color(0.72, 0.4, 0.95) : new Color(0.4, 0.9, 1.1)
    rig.rim.color.copy(c)
    rig.rim2.color.copy(c)
    const presets = {
      studio: { hemi: 0.9, key: 2.4, fill: 0.8, rim: 25, core: 0 },
      arena: { hemi: 0.35, key: 1.5, fill: 0.25, rim: 45, core: 0 },
      standoff: { hemi: 0.12, key: 0.55, fill: 0.05, rim: 60, core: 0 },
      core: { hemi: 0.12, key: 0.35, fill: 0.05, rim: 35, core: 6 },
      flat: { hemi: 2.5, key: 0.0, fill: 0.0, rim: 0, core: 0 },
    }[light]
    rig.hemi.intensity = presets.hemi
    rig.key.intensity = presets.key
    rig.fill.intensity = presets.fill
    rig.rim.intensity = presets.rim
    rig.rim2.intensity = presets.rim * 0.6
    rig.core.intensity = presets.core
  }, [light, fighter, rig])
  return (
    <>
      {Object.values(rig).map((o, i) => (
        <primitive key={i} object={o} dispose={null} />
      ))}
    </>
  )
}

function LabFloor() {
  const parts = useMemo(() => {
    const floor = new Mesh(new PlaneGeometry(30, 30), new MeshStandardMaterial({ color: 0x05090b, roughness: 0.32, metalness: 0.6 }))
    floor.rotation.x = -Math.PI / 2
    const grid = new GridHelper(30, 60, 0x0d3a44, 0x0a2129)
    grid.position.y = 0.001
    return { floor, grid }
  }, [])
  useEffect(
    () => () => {
      parts.floor.geometry.dispose()
      ;(parts.floor.material as MeshStandardMaterial).dispose()
      parts.grid.geometry.dispose()
    },
    [parts],
  )
  return (
    <>
      <primitive object={parts.floor} dispose={null} />
      <primitive object={parts.grid} dispose={null} />
    </>
  )
}

function LabFighterLoader() {
  const fighter = useLab((s) => s.fighter)
  const tier = useLab((s) => s.tier)
  const geometry = useCharacterGeometry(fighter, tier)
  return geometry ? <LabFighter geometry={geometry} /> : null
}

function LabFighter({ geometry }: { geometry: CharacterGeometry }) {
  const fighter = useLab((s) => s.fighter)
  const kit = FIGHTER_KITS[fighter]
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const rig = useMemo(() => new CharacterRig(kit.design.proportions), [kit])
  const body = useMemo(() => new SculptedFighter(kit.design, rig, geometry, kit.paint), [kit, rig, geometry])
  const skeleton = useMemo(() => new SkeletonLines([0.5, 1.9, 2.5]), [])
  useEffect(() => {
    body.attach(rig)
    return () => body.dispose()
  }, [body, rig])
  useEffect(() => () => skeleton.dispose(), [skeleton])
  useEffect(() => {
    useLab.getState().set({ stats: { triangles: body.triangles, ms: body.geometry.stats.ms, calls: 0 } })
  }, [body])
  const scratch = useMemo(() => ({ head: new Vector3(), toCam: new Vector3(), q: new Quaternion(), t: 0, frames: 0 }), [])

  useFrame((_, dt) => {
    const s = useLab.getState()
    const pose = kit.poses[s.pose] ?? kit.poses.stand ?? Object.values(kit.poses)[0]
    scratch.t += dt
    rig.apply(pose, pose, 1, { time: scratch.t, breath: 1, jitter: 0 })
    rig.root.updateMatrixWorld(true)
    const hand = (shape: string) => (shape === 'fist' ? 1 : shape === 'blade' ? 2 : 0)
    body.uniforms.uHand.value.set(hand(rig.handL), hand(rig.handR))
    applyExpression(s.expression, s.expression, 1, body.uniforms.uExpr.value, body.uniforms.uMouth.value, blinkAt(scratch.t, fighter === 'nox' ? 2 : 0))
    // Eyes find the camera in close views.
    rig.jointWorld('head', scratch.head)
    const local = scratch.toCam.copy(camera.position).sub(scratch.head).applyQuaternion(rig.joints.head.getWorldQuaternion(scratch.q).invert()).normalize()
    body.uniforms.uGaze.value.set(Math.max(-1, Math.min(1, local.x * 2.2)), Math.max(-1, Math.min(1, local.y * 2.2)))
    body.uniforms.uKeyDir.value.set(-2, 3, 4).normalize().transformDirection(camera.matrixWorldInverse)
    body.uniforms.uRimDir.value.set(1.5, 3.5, -4).normalize().transformDirection(camera.matrixWorldInverse)
    body.uniforms.uRimStrength.value = s.light === 'flat' ? 0 : 0.5
    body.uniforms.uTime.value = scratch.t
    body.setWireframe(s.wireframe)
    skeleton.update(rig, s.skeleton ? 1 : 0)
    if (++scratch.frames % 20 === 0) useLab.getState().set({ stats: { triangles: body.triangles, ms: body.geometry.stats.ms, calls: gl.info.render.calls } })
  })

  return (
    <>
      <primitive object={rig.root} dispose={null} />
      <primitive object={skeleton.lines} dispose={null} />
    </>
  )
}

/** Hidden character lab: one fighter, controllable views, poses, expressions and lighting. */
export function CharacterLab() {
  return (
    <div className="lab">
      <Canvas style={{ position: 'absolute', inset: 0 }} dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }} camera={{ fov: 30, near: 0.02, far: 100, position: [0, 1, 3.6] }} onCreated={({ gl }) => gl.setClearColor('#030607', 1)}>
        <fog attach="fog" args={['#030607', 6, 22]} />
        <LabCamera />
        <LabLights />
        <LabFloor />
        <LabFighterLoader />
      </Canvas>
      <LabPanel />
    </div>
  )
}
