import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
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
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { loft, merge, plate, xform } from '../../characters/anatomy'
import { FIGHTER_RIGS } from '../../characters/registry'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { FRAME_STAGE } from '../../engine/frameStages'
import { useExperience } from '../../../store/experienceStore'

const X = new Vector3(1, 0, 0)
const Z = new Vector3(0, 0, 1)
const PILLAR_HEIGHT = 6

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
  float fade = (1.0 - smoothstep(0.02, 1.0, y)) * smoothstep(0.0, 0.02, y);
  float scan = 0.7 + 0.3 * sin(y * 50.0 - uTime * 12.0);
  gl_FragColor = vec4(uColor * fade * scan * uIntensity, 1.0);
}`

// Ground ring + expanding pulse ring in one draw: `aPulse` marks the pulse ring's vertices.
const ringVert = /* glsl */ `
attribute float aPulse;
uniform float uPulseScale;
uniform float uOpacity;
uniform float uPulseOpacity;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.xz *= mix(1.0, uPulseScale, aPulse);
  vAlpha = mix(uOpacity, uPulseOpacity, aPulse);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`
const ringFrag = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(uColor * vAlpha, 1.0);
}`

function withPulse(g: RingGeometry, pulse: number) {
  g.setAttribute('aPulse', new BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(pulse), 1))
  return g
}

/**
 * The Coordinate Anchor: an original geometric throwing blade. A dark faceted body with
 * luminous edges, engraved coordinate notches, a ring grip and a small energy ring. It forms in
 * AERON's hand, flies end over end, plants tip-first, and becomes a beacon (thin light pillar,
 * ground ring, its own light) that the teleport resolves to.
 *
 * Blade space: the tip points along -Y, the grip ring is at +Y.
 *
 * Draws: blade metal (body + grip), blade glow (edges + notches + energy ring), pillar, rings.
 */
export function Anchor() {
  const engine = useCinematicEngine()

  const parts = useMemo(() => {
    const root = new Group()
    const blade = new Group()
    root.add(blade)
    const metal = new MeshStandardMaterial({ color: 0x1d2a31, metalness: 0.75, roughness: 0.28, flatShading: true })
    const glow = new MeshBasicMaterial({ color: new Color(0.7, 2.4, 3.0) })
    // Body: a long flattened diamond, widest a third from the grip.
    const body = loft(
      [
        { y: -0.2, rx: 0.002, rz: 0.001, n: 2 },
        { y: -0.12, rx: 0.018, rz: 0.006, n: 4 },
        { y: 0.0, rx: 0.03, rz: 0.009, n: 4 },
        { y: 0.04, rx: 0.016, rz: 0.008, n: 3 },
        { y: 0.07, rx: 0.011, rz: 0.009, n: 2.6 },
        { y: 0.12, rx: 0.011, rz: 0.009, n: 2.6 },
      ],
      { segments: 8 },
    )
    const grip = xform(new TorusGeometry(0.018, 0.004, 6, 18), { y: 0.14 })
    blade.add(new Mesh(merge([body, grip]), metal))
    // Luminous edges, engraved coordinate notches and the small energy ring: one glow draw.
    const edges = [-1, 1].map((s) => xform(plate(0.205, 0.004, 0.004, { taper: 1, tipTaper: 0.2 }), { rx: Math.PI, rz: s * 0.145, x: s * 0.03, y: 0.0 }))
    const notches = [0.0, -0.035, -0.06, -0.08].map((y, i) => xform(plate(0.004, 0.012 - i * 0.002, 0.003, { taper: 1, tipTaper: 1 }), { rz: Math.PI / 2, y, z: 0.0095 }))
    const energy = xform(new TorusGeometry(0.03, 0.0018, 4, 32), { rx: Math.PI / 2, y: 0.05 })
    blade.add(new Mesh(merge([...edges, ...notches, energy]), glow))

    const pillarMat = new ShaderMaterial({
      uniforms: { uIntensity: { value: 0 }, uTime: { value: 0 }, uColor: { value: new Color(0.45, 1.6, 2.1) } },
      vertexShader: pillarVert,
      fragmentShader: pillarFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    })
    const pillar = new Mesh(new CylinderGeometry(0.012, 0.012, PILLAR_HEIGHT, 8, 1, true).translate(0, PILLAR_HEIGHT / 2, 0), pillarMat)
    const ringMat = new ShaderMaterial({
      uniforms: { uPulseScale: { value: 1 }, uOpacity: { value: 0 }, uPulseOpacity: { value: 0 }, uColor: { value: new Color(0.45, 1.6, 2.1) } },
      vertexShader: ringVert,
      fragmentShader: ringFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    })
    const ringGeo = mergeGeometries([withPulse(new RingGeometry(0.22, 0.235, 48), 0), withPulse(new RingGeometry(0.6, 0.62, 48), 1)], false)!.rotateX(-Math.PI / 2)
    const rings = new Mesh(ringGeo, ringMat)
    const beacon = new Group()
    beacon.add(pillar, rings)
    const light = new PointLight(new Color(0.45, 0.9, 1.0), 0, 5, 2)
    root.add(light)
    for (const o of [root, beacon]) o.traverse((c) => (c.frustumCulled = false))
    return { root, blade, beacon, light, metal, glow, pillarMat, ringMat }
  }, [])

  useEffect(
    () => () => {
      for (const o of [parts.root, parts.beacon]) o.traverse((c) => (c as Mesh).geometry?.dispose())
      for (const m of [parts.metal, parts.glow, parts.pillarMat, parts.ringMat]) m.dispose()
    },
    [parts],
  )

  const scratch = useMemo(
    () => ({ fly: new Quaternion().setFromAxisAngle(Z, Math.PI / 2), plant: new Quaternion().setFromAxisAngle(Z, 0.35), spin: new Quaternion(), hand: new Vector3(), handQ: new Quaternion(), off: new Vector3(), q: new Quaternion() }),
    [],
  )

  useFrame(() => {
    const a = engine.state.anchor
    const t = engine.elapsed
    const fxOn = useExperience.getState().fx === 'full'
    const visible = a.visible > 0.01
    parts.root.visible = visible
    parts.beacon.visible = visible && a.planted > 0.01
    if (!visible) {
      parts.light.intensity = 0
      return
    }
    // In flight: tip leading along the throw (+X world, toward NOX), tumbling end over end.
    scratch.spin.setFromAxisAngle(X, a.spin)
    scratch.q.copy(scratch.fly).multiply(scratch.spin)
    scratch.q.slerp(scratch.plant, Math.min(1, a.planted * 3))
    parts.root.position.copy(a.position)
    // Held: follows AERON's right hand, blade along the fingers.
    const rig = FIGHTER_RIGS.velocity
    if (rig && a.held > 0) {
      rig.jointWorld('handR', scratch.hand)
      rig.joints.handR.getWorldQuaternion(scratch.handQ)
      scratch.off.set(0, -0.1, 0.03).applyQuaternion(scratch.handQ)
      scratch.hand.add(scratch.off)
      parts.root.position.lerp(scratch.hand, a.held)
      scratch.q.slerp(scratch.handQ, a.held)
    }
    parts.blade.quaternion.copy(scratch.q)
    parts.blade.scale.setScalar(Math.min(1, a.visible * 1.4))

    parts.beacon.position.set(a.position.x, 0.01, a.position.z)
    parts.pillarMat.uniforms.uIntensity.value = a.planted * (0.5 + a.glow * 0.6) * (fxOn ? 1 : 0.4)
    parts.pillarMat.uniforms.uTime.value = t
    const pulse = (t * 1.4) % 1
    const ru = parts.ringMat.uniforms
    ru.uOpacity.value = a.planted
    ru.uPulseScale.value = 0.35 + pulse * 1.4
    ru.uPulseOpacity.value = a.planted * (1 - pulse) * 0.7
    parts.light.intensity = a.visible * (0.8 + a.glow * 4)
  }, FRAME_STAGE.LATE)

  return (
    <>
      <primitive name="anchor" object={parts.root} />
      <primitive name="anchor" object={parts.beacon} />
    </>
  )
}
