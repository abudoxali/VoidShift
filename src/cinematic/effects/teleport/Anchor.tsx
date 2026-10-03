import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
} from 'three'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { FRAME_STAGE } from '../../engine/frameStages'
import { gem, part } from '../../characters/bodyParts'
import { useGlyphLabel } from '../typography/GlyphLayer'
import { formatCoord, scrambleText } from '../typography/glyphs'

const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)
const PILLAR_HEIGHT = 7

const pillarVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const pillarFrag = /* glsl */ `
uniform float uIntensity;
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float y = vUv.y;
  float fade = (1.0 - smoothstep(0.05, 1.0, y)) * smoothstep(0.0, 0.02, y);
  float scan = 0.65 + 0.35 * sin(y * 60.0 - uTime * 14.0);
  gl_FragColor = vec4(uColor * fade * scan * uIntensity, 1.0);
}`

/**
 * VELOCITY's teleport anchor: a thrown triangular blade that spins in flight, plants itself in
 * the floor and becomes a beacon (light pillar, ground ring, coordinate tag, its own light).
 */
export function Anchor() {
  const engine = useCinematicEngine()
  const label = useGlyphLabel({ maxChars: 24, size: 0.085, color: [0.55, 1.9, 2.4], offset: [1.4, 0] })

  const parts = useMemo(() => {
    const root = new Group()
    const blade = new Group()
    root.add(blade)

    const metal = new MeshStandardMaterial({ color: 0x2a4652, metalness: 0.5, roughness: 0.35, emissive: new Color(0x0d4452), flatShading: true })
    const glow = new MeshBasicMaterial({ color: new Color(0.7, 2.6, 3.2) })
    const edge = new LineBasicMaterial({ color: new Color(0.5, 1.8, 2.3) })
    // Tip points down (-Y); the grip ring sits at the top.
    blade.add(part(new ConeGeometry(0.075, 0.6, 3).rotateX(Math.PI).scale(1, 1, 0.4), metal, { edges: edge }))
    const spine = part(new ConeGeometry(0.012, 0.56, 3).rotateX(Math.PI), glow)
    spine.position.z = 0.012
    blade.add(spine)
    const core = part(gem(0.04, 0.05, 0.04), glow)
    core.position.y = 0.2
    blade.add(core)
    const ring = new Mesh(new TorusGeometry(0.075, 0.009, 4, 3), glow)
    ring.position.y = 0.3
    ring.rotation.x = Math.PI / 2
    blade.add(ring)

    const pillarMat = new ShaderMaterial({
      uniforms: { uIntensity: { value: 0 }, uTime: { value: 0 }, uColor: { value: new Color(0.5, 1.7, 2.2) } },
      vertexShader: pillarVert,
      fragmentShader: pillarFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    })
    const pillar = new Mesh(new CylinderGeometry(0.018, 0.018, PILLAR_HEIGHT, 8, 1, true).translate(0, PILLAR_HEIGHT / 2, 0), pillarMat)
    const ringMat = new MeshBasicMaterial({ color: new Color(0.5, 1.8, 2.3), transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })
    const groundRing = new Mesh(new RingGeometry(0.34, 0.37, 48).rotateX(-Math.PI / 2), ringMat)
    const pulseMat = ringMat.clone()
    const pulseRing = new Mesh(new RingGeometry(0.9, 0.93, 48).rotateX(-Math.PI / 2), pulseMat)
    const beacon = new Group()
    beacon.add(pillar, groundRing, pulseRing)

    const light = new PointLight(new Color(0.45, 0.9, 1.0), 0, 7, 2)
    root.add(light)
    for (const o of [root, beacon]) o.traverse((c) => (c.frustumCulled = false))
    return { root, blade, beacon, light, metal, glow, edge, pillarMat, ringMat, pulseMat, pulseRing, groundRing }
  }, [])

  useEffect(
    () => () => {
      for (const o of [parts.root, parts.beacon]) o.traverse((c) => (c as Mesh).geometry?.dispose())
      for (const m of [parts.metal, parts.glow, parts.edge, parts.pillarMat, parts.ringMat, parts.pulseMat]) m.dispose()
    },
    [parts],
  )

  const scratch = useMemo(() => ({ fly: new Quaternion().setFromAxisAngle(Z, Math.PI / 2), plant: new Quaternion().setFromAxisAngle(Z, -0.3), spin: new Quaternion(), tag: new Vector3() }), [])

  useFrame(() => {
    const a = engine.state.anchor
    const t = engine.elapsed
    const visible = a.visible > 0.01
    parts.root.visible = visible
    const planted = a.planted
    parts.beacon.visible = visible && planted > 0.01
    parts.root.position.copy(a.position)
    // Flying: tip leads along +X, spinning about the blade axis. Planted: tip in the floor, tilted.
    parts.blade.quaternion.slerpQuaternions(scratch.fly, scratch.plant, Math.min(1, planted * 3))
    scratch.spin.setFromAxisAngle(Y, a.spin)
    parts.blade.quaternion.multiply(scratch.spin)
    parts.blade.scale.setScalar(Math.min(1, a.visible * 1.5))

    parts.beacon.position.set(a.position.x, 0.01, a.position.z)
    const beam = planted * (0.45 + a.glow * 0.6)
    parts.pillarMat.uniforms.uIntensity.value = beam
    parts.pillarMat.uniforms.uTime.value = t
    parts.ringMat.opacity = planted
    const pulse = (t * 1.4) % 1
    parts.pulseRing.scale.setScalar(0.35 + pulse * 1.6)
    parts.pulseMat.opacity = planted * (1 - pulse) * 0.8
    parts.light.intensity = a.visible * (1.2 + a.glow * 5)

    const tag = label.current
    if (tag) {
      tag.setAnchor(scratch.tag.set(a.position.x, 1.05, a.position.z))
      const text = `ANCHOR\n${formatCoord(a.position.x)} ${formatCoord(a.position.z)}`
      tag.setText(scrambleText(text, Math.min(1, planted * 1.6), 7, Math.floor(t * 20)))
      tag.setOpacity(planted * 0.9)
    }
  }, FRAME_STAGE.WORLD)

  return (
    <>
      <primitive object={parts.root} />
      <primitive object={parts.beacon} />
    </>
  )
}
