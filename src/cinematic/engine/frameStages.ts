/**
 * Explicit per-frame ordering for R3F `useFrame` callbacks. Negative priorities keep R3F's
 * default rendering intact; the post-processing composer renders at priority 1.
 *
 *  ENGINE  advance the cinematic clock, sample the timeline, derive the world field
 *  CAMERA  rig interprets the camera state → three.js camera
 *  WORLD   environment + entities write their uniforms / buffers
 *  LATE    consumers of everything above (glyph buffer flush, post-processing uniforms)
 */
export const FRAME_STAGE = {
  ENGINE: -40,
  CAMERA: -30,
  WORLD: -20,
  LATE: -10,
} as const
