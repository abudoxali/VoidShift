/** Small, allocation-free math helpers shared by the engine and render loop. */

export const clamp = (v: number, min = 0, max = 1): number => (v < min ? min : v > max ? max : v)

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/**
 * Frame-rate independent exponential damping.
 * `lambda` is the convergence rate (1/s); larger = snappier. Same result for any dt split.
 */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lambda <= 0 ? current : lerp(current, target, 1 - Math.exp(-lambda * dt))

export const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

/** Fast deterministic hash in [0, 1) for integer-ish inputs (used for procedural, seed-stable behaviour). */
export const hash1 = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return s - Math.floor(s)
}

export const degToRad = (deg: number): number => (deg * Math.PI) / 180
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI
