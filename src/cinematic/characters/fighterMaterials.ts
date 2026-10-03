import { Color, type Material } from 'three'
import { GLSL } from '../shaders'

/** Uniforms shared by every material of one fighter (dissolve + emissive drive). */
export function createFighterUniforms(edge: readonly [number, number, number]) {
  return {
    uReveal: { value: 0 },
    uEdgeColor: { value: new Color(...edge) },
  }
}
export type FighterUniforms = ReturnType<typeof createFighterUniforms>

/**
 * Injects a world-space noise dissolve into a built-in three.js material (standard / basic /
 * line-basic). Lit materials stay lit by the stage lights; the dissolve front glows with the
 * fighter's energy colour. Used for reveals, teleport collapse and reconstruction.
 */
export function withDissolve<T extends Material>(material: T, uniforms: FighterUniforms, key: string): T {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uReveal = uniforms.uReveal
    shader.uniforms.uEdgeColor = uniforms.uEdgeColor
    shader.vertexShader =
      'varying vec3 vVsWorld;\n' +
      shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vVsWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader =
      'uniform float uReveal;\nuniform vec3 uEdgeColor;\nvarying vec3 vVsWorld;\n' +
      GLSL.common +
      shader.fragmentShader
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
  float vsN = vsNoise3(vVsWorld * 9.0) * 0.7 + vsNoise3(vVsWorld * 23.0) * 0.3;
  float vsCut = uReveal * 1.2 - 0.1;
  if (vsN > vsCut) discard;
  float vsEdge = (1.0 - smoothstep(0.0, 0.06, vsCut - vsN)) * step(uReveal, 0.999);`,
        )
        .replace('#include <opaque_fragment>', 'outgoingLight += uEdgeColor * vsEdge;\n#include <opaque_fragment>')
  }
  material.customProgramCacheKey = () => `vs-dissolve-${key}`
  return material
}
