import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BackSide, ShaderMaterial, SphereGeometry, type Mesh } from 'three'
import { useCinematicEngine } from '../engine/CinematicContext'
import { FRAME_STAGE } from '../engine/frameStages'
import { useWorld } from '../scenes/WorldContext'
import { GLSL, fieldUniforms } from '../shaders'
import { ENVIRONMENT_PALETTE as P } from './palette'

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // always at the far plane
}`

const FRAG = /* glsl */ `
uniform float uFade;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uHaze;
uniform vec3 uAccent;
varying vec3 vDir;

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    v += a * vsNoise3(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  // Below the horizon the dome equals the grid's fog colour, so the plane's edge never shows.
  vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.5, h));

  // Stratified haze: slow-moving bands hugging the horizon — volume, not stars.
  float t = uTime * 0.012 * uMotion;
  float haze = fbm(vec3(d.x * 2.2 + t, h * 7.0, d.z * 2.2 - t));
  float band = exp(-abs(h - 0.05) * 7.0) * smoothstep(0.0, 0.04, h);
  col += uHaze * haze * band * 1.2;

  // High, faint vertical light shafts — the "depth" of the dimension.
  float shafts = fbm(vec3(atan(d.z, d.x) * 6.0, 0.0, t * 2.0));
  col += uHaze * 0.35 * smoothstep(0.55, 0.85, shafts) * smoothstep(0.0, 0.25, h) * (1.0 - smoothstep(0.3, 0.9, h));

  // The direction of VELOCITY carries a trace of its colour.
  vec3 toVel = normalize(uVelocityPos - cameraPosition);
  col += uAccent * 0.025 * uVelocityEnergy * pow(max(dot(d, toVel), 0.0), 6.0);

  col *= uFade;
  // Dither against banding in the dark gradients.
  col += (vsHash12(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`

/** Sky dome that follows the camera: horizon haze, faint shafts, no stars. */
export function Atmosphere() {
  const engine = useCinematicEngine()
  const { uniforms: world, profile } = useWorld()
  const camera = useThree((s) => s.camera)
  const mesh = useRef<Mesh>(null)

  const geometry = useMemo(() => new SphereGeometry(150, 48, 24), [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        defines: { OCTAVES: profile.atmosphereOctaves },
        uniforms: {
          ...fieldUniforms(world),
          uFade: { value: 0 },
          uHorizon: { value: P.horizon },
          uZenith: { value: P.zenith },
          uHaze: { value: P.haze },
          uAccent: { value: P.accent },
        },
        vertexShader: VERT,
        fragmentShader: GLSL.common + GLSL.field + FRAG,
        side: BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    [world, profile.atmosphereOctaves],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    mesh.current?.position.copy(camera.position)
    material.uniforms.uFade.value = engine.state.world.atmosphere
  }, FRAME_STAGE.WORLD)

  return <mesh ref={mesh} geometry={geometry} material={material} renderOrder={-2} frustumCulled={false} dispose={null} />
}
