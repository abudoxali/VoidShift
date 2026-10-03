import type { WebGLRenderer } from 'three'

/** Totals of the last completed frame (all passes), when the renderer's auto-reset is off. */
export const lastFrameStats = { calls: 0, triangles: 0, points: 0, lines: 0 }

/** Called once per frame before `renderer.info.reset()`. */
export function recordFrameStats(renderer: WebGLRenderer): void {
  const r = renderer.info.render
  lastFrameStats.calls = r.calls
  lastFrameStats.triangles = r.triangles
  lastFrameStats.points = r.points
  lastFrameStats.lines = r.lines
}
