import { AdditiveBlending, ShaderMaterial } from 'three'
import { GLSL, fieldUniforms, type WorldUniforms } from '../../shaders'
import accretionFrag from './accretion.frag.glsl?raw'
import accretionVert from './accretion.vert.glsl?raw'
import shellFrag from './voidShell.frag.glsl?raw'
import shellVert from './voidShell.vert.glsl?raw'

export const VOID_PALETTE = {
  shell: [0.3, 0.24, 0.55],
  hot: [1.9, 0.16, 0.36],
  label: [0.78, 0.6, 1.25],
} as const satisfies Record<string, readonly [number, number, number]>

const HEADER = GLSL.common + GLSL.field + GLSL.assemble

export function createShellMaterial(world: WorldUniforms) {
  return new ShaderMaterial({
    uniforms: {
      ...fieldUniforms(world),
      uColor: { value: VOID_PALETTE.shell },
      uHot: { value: VOID_PALETTE.hot },
      uReveal: { value: 0 },
      uCorruption: { value: 0 },
    },
    vertexShader: HEADER + shellVert,
    fragmentShader: shellFrag,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

export function createAccretionMaterial(world: WorldUniforms) {
  return new ShaderMaterial({
    uniforms: {
      ...fieldUniforms(world),
      uPointScale: world.uPointScale,
      uSize: { value: 0.02 },
      uReveal: { value: 0 },
    },
    vertexShader: HEADER + accretionVert,
    fragmentShader: accretionFrag,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}
