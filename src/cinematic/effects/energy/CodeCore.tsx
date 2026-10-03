import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  PointLight,
  Points,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import type { CharacterRig } from '../../animation/CharacterRig'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { FRAME_STAGE } from '../../engine/frameStages'
import { createRng } from '../../../utils/random'
import { coreFrag, coreVert, haloFrag, particleFrag, particleVert, ringFrag, ringVert } from './codeCoreShaders'

const ARCS = 7
const ARC_SEGMENTS = 7
const SPIRAL = 320

/**
 * The Code Core: VELOCITY's signature attack, formed in and carried by its striking hand.
 * A white-hot spiralling sphere inside a haze shell, three rotating rings of data, branching
 * arcs, an inward spiral of particles and a light that takes over the stage as it charges.
 */
export function CodeCore({ rig }: { rig: CharacterRig }) {
  const engine = useCinematicEngine()

  const parts = useMemo(() => {
    const root = new Group()
    const uniforms = { uTime: { value: 0 }, uCharge: { value: 0 }, uOverload: { value: 0 } }
    const coreMat = new ShaderMaterial({ uniforms, vertexShader: coreVert, fragmentShader: coreFrag, transparent: true, depthWrite: false, blending: AdditiveBlending })
    const core = new Mesh(new SphereGeometry(1, 40, 28), coreMat)
    const haloMat = new ShaderMaterial({ uniforms, vertexShader: coreVert, fragmentShader: haloFrag, transparent: true, depthWrite: false, blending: AdditiveBlending, side: BackSide })
    const halo = new Mesh(new SphereGeometry(1, 32, 20), haloMat)
    root.add(core, halo)

    const rings: Mesh[] = []
    const ringMats: ShaderMaterial[] = []
    for (let i = 0; i < 3; i++) {
      const m = new ShaderMaterial({
        uniforms: { ...uniforms, uSeed: { value: i * 17.3 + 3 }, uSegments: { value: 36 + i * 12 } },
        vertexShader: ringVert,
        fragmentShader: ringFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      })
      const ring = new Mesh(new TorusGeometry(1, 0.035, 3, 96), m)
      rings.push(ring)
      ringMats.push(m)
      root.add(ring)
    }

    const arcPositions = new Float32Array(ARCS * ARC_SEGMENTS * 2 * 3)
    const arcGeo = new BufferGeometry()
    const arcAttr = new BufferAttribute(arcPositions, 3).setUsage(DynamicDrawUsage)
    arcGeo.setAttribute('position', arcAttr)
    const arcMat = new LineBasicMaterial({ color: new Color(1.4, 2.6, 3.2), transparent: true, blending: AdditiveBlending, depthWrite: false })
    const arcs = new LineSegments(arcGeo, arcMat)
    root.add(arcs)

    const rng = createRng(4242)
    const seeds = new Float32Array(SPIRAL * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = rng()
    const spiralGeo = new BufferGeometry()
    spiralGeo.setAttribute('position', new BufferAttribute(new Float32Array(SPIRAL * 3), 3))
    spiralGeo.setAttribute('aSeed', new BufferAttribute(seeds, 4))
    const spiralMat = new ShaderMaterial({ uniforms, vertexShader: particleVert, fragmentShader: particleFrag, transparent: true, depthWrite: false, blending: AdditiveBlending })
    const spiral = new Points(spiralGeo, spiralMat)
    root.add(spiral)

    const light = new PointLight(new Color(0.6, 1.0, 1.1), 0, 12, 1.6)
    root.add(light)
    root.traverse((o) => (o.frustumCulled = false))
    return { root, uniforms, core, halo, rings, ringMats, coreMat, haloMat, arcs, arcAttr, arcMat, spiralMat, light }
  }, [])

  useEffect(
    () => () => {
      parts.root.traverse((o) => (o as Mesh).geometry?.dispose())
      for (const m of [parts.coreMat, parts.haloMat, parts.arcMat, parts.spiralMat, ...parts.ringMats]) m.dispose()
    },
    [parts],
  )

  const scratch = useMemo(() => ({ hand: new Vector3(), q: new Quaternion(), off: new Vector3(), a: new Vector3(), b: new Vector3(), dir: new Vector3() }), [])

  useFrame(() => {
    const c = engine.state.core
    const f = engine.state.fighters.velocity
    const charge = c.charge * f.reveal
    const visible = charge > 0.005
    parts.root.visible = visible
    if (!visible) {
      parts.light.intensity = 0
      return
    }
    const t = engine.elapsed
    const over = c.overload
    parts.uniforms.uTime.value = t
    parts.uniforms.uCharge.value = charge
    parts.uniforms.uOverload.value = over

    // Carried just beyond the palm of the striking hand.
    rig.jointWorld('handR', scratch.hand)
    rig.joints.handR.getWorldQuaternion(scratch.q)
    scratch.off.set(0, -0.2, 0.04).applyQuaternion(scratch.q)
    parts.root.position.copy(scratch.hand).add(scratch.off)

    const pulse = 1 + Math.sin(t * 22) * 0.04 * charge + over * 0.25 * Math.sin(t * 61)
    const radius = (0.05 + charge * 0.24 + over * 0.1) * pulse
    parts.core.scale.setScalar(radius)
    parts.halo.scale.setScalar(radius * (2.3 + over * 1.2))
    parts.rings.forEach((ring, i) => {
      const r = radius * (1.9 + i * 0.55) * (0.6 + 0.4 * Math.min(1, charge * 1.4))
      ring.scale.setScalar(r)
      ring.rotation.set(t * (1.2 + i * 0.7) + i * 1.1, t * (0.8 - i * 0.5) + i * 2.1, i * 0.9 + t * 0.3)
    })

    // Arcs: jagged branches re-struck 24 times a second, deterministic per strike.
    const strike = Math.floor(t * 24)
    const arr = parts.arcAttr.array as Float32Array
    const rng = createRng(strike * 31 + 7)
    const reach = radius * (2.2 + over * 2.5)
    let k = 0
    for (let a = 0; a < ARCS; a++) {
      const live = a < Math.round(2 + charge * 4 + over * 2)
      scratch.dir.set(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize()
      scratch.a.copy(scratch.dir).multiplyScalar(radius * 0.9)
      for (let s = 0; s < ARC_SEGMENTS; s++) {
        const u = (s + 1) / ARC_SEGMENTS
        scratch.b
          .copy(scratch.dir)
          .multiplyScalar(radius * 0.9 + (reach - radius * 0.9) * u)
          .add(scratch.off.set(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(reach * 0.35 * u))
        const pa = live ? scratch.a : scratch.b.set(0, 0, 0)
        arr[k++] = pa.x
        arr[k++] = pa.y
        arr[k++] = pa.z
        arr[k++] = live ? scratch.b.x : 0
        arr[k++] = live ? scratch.b.y : 0
        arr[k++] = live ? scratch.b.z : 0
        if (live) scratch.a.copy(scratch.b)
      }
    }
    parts.arcAttr.needsUpdate = true
    parts.arcMat.opacity = Math.min(1, charge * 1.3)

    parts.light.intensity = charge * 7 + over * 22
  }, FRAME_STAGE.LATE)

  return <primitive object={parts.root} dispose={null} />
}
