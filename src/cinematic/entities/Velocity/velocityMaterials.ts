import { AdditiveBlending, ShaderMaterial, type Vector3 } from 'three'
import { GLSL, fieldUniforms, type WorldUniforms } from '../../shaders'
import lineFrag from './velocityLine.frag.glsl?raw'
import lineVert from './velocityLine.vert.glsl?raw'
import streakFrag from './velocityStreaks.frag.glsl?raw'
import streakVert from './velocityStreaks.vert.glsl?raw'

export const VELOCITY_PALETTE = {
  line: [0.4, 1.15, 1.6],
  dim: [0.22, 0.62, 0.85],
  streak: [0.45, 1.25, 1.85],
  trail: [0.3, 1.0, 1.7],
  label: [0.62, 1.35, 1.6],
  ghost: [0.3, 0.85, 1.25],
  vector: [0.45, 1.2, 1.55],
} as const satisfies Record<string, readonly [number, number, number]>

const HEADER = GLSL.common + GLSL.field + GLSL.assemble

export function createVelocityLineMaterial(world: WorldUniforms, color: readonly [number, number, number], scatterScale = 2.6) {
  return new ShaderMaterial({
    uniforms: {
      ...fieldUniforms(world),
      uColor: { value: color },
      uAssemble: { value: 0 },
      uReveal: { value: 0 },
      uInterference: { value: 0 },
      uScatterScale: { value: scatterScale },
    },
    vertexShader: HEADER + lineVert,
    fragmentShader: lineFrag,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

/** `motion` is the engine's derived velocity vector, shared by reference. */
export function createVelocityStreakMaterial(world: WorldUniforms, motion: Vector3) {
  return new ShaderMaterial({
    uniforms: {
      ...fieldUniforms(world),
      uColor: { value: VELOCITY_PALETTE.streak },
      uEntity: { value: world.uVelocityPos.value },
      uMotionVec: { value: motion },
      uAssemble: { value: 0 },
      uReveal: { value: 0 },
      uEnergy: { value: 0 },
      uHeading: { value: 0 },
    },
    vertexShader: HEADER + streakVert,
    fragmentShader: streakFrag,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

const CORE_VERT = /* glsl */ `
uniform float uPointScale;
uniform float uSize;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(uSize * uPointScale / -mv.z, 2.0, 256.0);
  gl_Position = projectionMatrix * mv;
}`

const CORE_FRAG = /* glsl */ `
uniform float uIntensity;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float core = exp(-d * d * 26.0) * 2.2 + exp(-d * 5.0) * 0.2;
  float a = core * uIntensity * (1.0 - smoothstep(0.7, 1.0, d));
  if (a < 0.003) discard;
  gl_FragColor = vec4(vec3(0.75, 1.15, 1.35), a);
}`

/** The kinetic singularity at the centre of the vector kernel. */
export function createCoreMaterial(world: WorldUniforms) {
  return new ShaderMaterial({
    uniforms: { uPointScale: world.uPointScale, uSize: { value: 0.5 }, uIntensity: { value: 0 } },
    vertexShader: CORE_VERT,
    fragmentShader: CORE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}
