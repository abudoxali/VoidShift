import type { Vector3 } from 'three'
import { clamp, easeOutExpo, hash1, lerp } from '../../../utils/math'

const PERIOD = 2.6
const SNAP = 0.16

/**
 * VELOCITY at rest is not idle-floating: it holds perfectly still, then snaps to a new
 * micro-position in ~160 ms, then holds again. Stillness/speed contrast at the smallest scale.
 * Deterministic in `elapsed`.
 */
export function velocityIdleOffset(elapsed: number, weight: number, out: Vector3): Vector3 {
  if (weight <= 0) return out.set(0, 0, 0)
  const k = Math.floor(elapsed / PERIOD)
  const t = easeOutExpo(clamp((elapsed - k * PERIOD) / SNAP))
  const target = (n: number, axis: number, amp: number) => (hash1(n * 3.17 + axis * 11.3) - 0.5) * amp
  out.set(
    lerp(target(k - 1, 0, 0.24), target(k, 0, 0.24), t),
    lerp(target(k - 1, 1, 0.14), target(k, 1, 0.14), t) + Math.sin(elapsed * 1.05) * 0.02,
    lerp(target(k - 1, 2, 0.18), target(k, 2, 0.18), t),
  )
  return out.multiplyScalar(weight)
}
