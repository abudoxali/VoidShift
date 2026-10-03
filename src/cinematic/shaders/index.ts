import { Vector3 } from 'three'
import assembleChunk from './chunks/assemble.glsl?raw'
import commonChunk from './chunks/common.glsl?raw'
import fieldChunk from './chunks/field.glsl?raw'

export const GLSL = {
  common: commonChunk,
  field: fieldChunk,
  assemble: assembleChunk,
} as const

/**
 * Uniforms shared BY REFERENCE across every world material. SceneController writes them
 * once per frame; all materials see the update without per-material bookkeeping.
 */
export function createWorldUniforms() {
  return {
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uVoidPos: { value: new Vector3() },
    uVoidMass: { value: 0 },
    uVoidRadius: { value: 0.6 },
    uVelocityPos: { value: new Vector3() },
    uVelocityEnergy: { value: 0 },
    uVoidPhase: { value: 0 },
    uVoidFold: { value: 0 },
    uVoidInversion: { value: 0 },
    uPhaseAxis: { value: new Vector3(1, 0, 0) },
    uSplitAxis: { value: new Vector3(0, 0, 1) },
    /** Converts world-space point size to pixels: bufferHeight / (2·tan(fov/2)). */
    uPointScale: { value: 600 },
  }
}

export type WorldUniforms = ReturnType<typeof createWorldUniforms>

/** Picks the field uniforms a material needs while keeping the shared references. */
export function fieldUniforms(world: WorldUniforms) {
  return {
    uTime: world.uTime,
    uMotion: world.uMotion,
    uVoidPos: world.uVoidPos,
    uVoidMass: world.uVoidMass,
    uVoidRadius: world.uVoidRadius,
    uVelocityPos: world.uVelocityPos,
    uVelocityEnergy: world.uVelocityEnergy,
    uVoidPhase: world.uVoidPhase,
    uVoidFold: world.uVoidFold,
    uVoidInversion: world.uVoidInversion,
    uPhaseAxis: world.uPhaseAxis,
    uSplitAxis: world.uSplitAxis,
  }
}
