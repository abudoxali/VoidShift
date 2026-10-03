import { clamp, degToRad, lerp, radToDeg, smoothstep } from '../../utils/math'

/** Aspect ratio all shots are composed for. */
export const DESIGN_ASPECT = 16 / 9
/** Wider than this, perspective distortion of the entities becomes objectionable. */
export const MAX_ADAPTED_FOV = 58

export interface Framing {
  /** Vertical FOV to use. */
  fov: number
  /** Multiplier on the camera→target distance (dolly back when FOV alone is not enough). */
  distance: number
}

/**
 * Adapts a 16:9 composition to any viewport by preserving horizontal coverage instead of
 * cropping. Portrait screens keep slightly less coverage (the entities are allowed closer to
 * the edges) and fall back to dollying out once the FOV ceiling is reached.
 */
export function computeFraming(aspect: number, designFov: number, out: Framing = { fov: 0, distance: 1 }): Framing {
  const safeAspect = clamp(aspect, 0.2, 10)
  if (safeAspect >= DESIGN_ASPECT) {
    out.fov = designFov
    out.distance = 1
    return out
  }
  const coverage = lerp(0.84, 1, smoothstep(0.55, DESIGN_ASPECT, safeAspect))
  const tanV = Math.tan(degToRad(designFov) / 2)
  const neededTanV = Math.max(tanV, (tanV * DESIGN_ASPECT * coverage) / safeAspect)
  const maxTanV = Math.tan(degToRad(Math.max(MAX_ADAPTED_FOV, designFov)) / 2)
  if (neededTanV <= maxTanV) {
    out.fov = radToDeg(2 * Math.atan(neededTanV))
    out.distance = 1
  } else {
    out.fov = Math.max(MAX_ADAPTED_FOV, designFov)
    out.distance = neededTanV / maxTanV
  }
  return out
}
