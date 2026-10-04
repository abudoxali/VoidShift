import { useFrame } from '@react-three/fiber'
import { useExperience } from '../../store/experienceStore'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, ShaderMaterial, Sphere, Vector3 } from 'three'
import { buildParticleGeometry, setParticleCount } from '../effects/particles/particleGeometry'
import { useCinematicEngine } from '../engine/CinematicContext'
import { FRAME_STAGE } from '../engine/frameStages'
import { PARTICLE_CAPACITY } from '../engine/PerformanceManager'
import { useWorld } from '../scenes/WorldContext'
import { GLSL, fieldUniforms } from '../shaders'
import { ENVIRONMENT_PALETTE as P } from './palette'

const VERT = /* glsl */ `
attribute vec4 aSeed;  // x: drift phase, y: size, z: kind, w: twinkle phase
uniform float uReveal;
uniform float uPointScale;
varying float vAlpha;
varying float vKind;
varying float vHeat;

void main() {
  vec3 base = position;
  vec3 p = base;
  // Slow measured drift along a per-point axis.
  vec3 axis = normalize(vsHash31(aSeed.x * 113.0) - 0.5);
  p += axis * sin(uTime * 0.11 * uMotion + aSeed.x * 6.2831853) * 0.45;

  // The VOID bends the data field: pull + frame-drag.
  vec3 pull = vsVoidPull(p, 2.2) + vsVoidSwirl(p, 0.9);
  p += pull;
  vHeat = clamp(length(pull) * 0.8, 0.0, 1.0);

  vec4 mv = viewMatrix * vec4(p, 1.0);
  float px = (0.022 + aSeed.y * 0.03) * uPointScale / -mv.z;
  vKind = step(0.86, aSeed.z);
  px *= mix(1.0, 2.6, vKind);
  gl_PointSize = clamp(px, 1.0, 14.0);

  float revealed = 1.0 - smoothstep(uReveal - 6.0, uReveal, length(base.xz));
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.4 + aSeed.w) * uMotion + aSeed.w * 40.0);
  float fog = 1.0 - smoothstep(25.0, 70.0, -mv.z);
  vAlpha = revealed * twinkle * fog * min(px, 1.0) * (0.22 + vsVelocityPresence(p, 0.4) * 1.5);
  gl_Position = projectionMatrix * mv;
}`

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uVoidTint;
varying float vAlpha;
varying float vKind;
varying float vHeat;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float dotShape = (1.0 - smoothstep(0.15, 0.5, length(c)));
  // Survey markers: tiny crosses — sampled positions in space.
  float arm = 0.07;
  float cross = max(step(abs(c.x), arm) , step(abs(c.y), arm)) * step(length(c), 0.48);
  float shape = mix(dotShape, cross, vKind);
  float a = vAlpha * shape;
  if (a < 0.003) discard;
  gl_FragColor = vec4(mix(uColor, uVoidTint, vHeat), a);
}`

/** Bounds of the data volume: a ring around the stage, kept clear in the middle for action. */
function sampleFieldPoint(rng: () => number): [number, number, number] {
  const angle = rng() * Math.PI * 2
  const radius = 4 + Math.pow(rng(), 0.75) * 46
  const lowLayer = rng() < 0.35
  const y = lowLayer ? 0.05 + rng() * 0.6 : 0.2 + Math.pow(rng(), 1.7) * 16
  return [Math.cos(angle) * radius, y, Math.sin(angle) * radius - 4]
}

/**
 * Sparse floating data points and survey markers: the measured contents of the dimension.
 * Fully GPU-animated; one draw call; quality tiers adjust only the draw range.
 */
export function BackgroundField() {
  const engine = useCinematicEngine()
  const { uniforms: world, profile } = useWorld()

  const geometry = useMemo(
    () =>
      buildParticleGeometry({
        capacity: PARTICLE_CAPACITY.field,
        seed: 9001,
        bounds: new Sphere(new Vector3(0, 6, -4), 60),
        attributes: { aSeed: 4 },
        init(w, _i, rng) {
          w.set('position', ...sampleFieldPoint(rng))
          w.set('aSeed', rng(), rng(), rng(), rng())
        },
      }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => setParticleCount(geometry, profile.particles.field), [geometry, profile.particles.field])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          ...fieldUniforms(world),
          uPointScale: world.uPointScale,
          uReveal: { value: 0 },
          uColor: { value: P.data },
          uVoidTint: { value: P.voidTint },
        },
        vertexShader: GLSL.common + GLSL.field + VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [world],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    material.uniforms.uReveal.value = useExperience.getState().fx === 'full' ? engine.state.world.reveal : 0
  }, FRAME_STAGE.WORLD)

  return <points name="background" geometry={geometry} material={material} frustumCulled={false} dispose={null} />
}
