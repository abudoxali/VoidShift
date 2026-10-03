import { Vector3 } from 'three'
import { createRng } from '../../../utils/random'

/**
 * Deterministic ballistic debris: every piece is a closed-form function of its seed and the time
 * since contact, so scrubbing / seeking / frame-stepped capture all agree.
 */
export interface DebrisPiece {
  dir: Vector3
  speed: number
  size: number
  spinAxis: Vector3
  spin: number
  /** Gets pulled back into VOID during the decay. */
  absorbed: boolean
  delay: number
  seed: number
}

const G = 9.8
const FLOOR_FRICTION = 3.5

export function createDebris(count: number, seed: number, absorbedFraction: number, speedScale = 1): DebrisPiece[] {
  const rng = createRng(seed)
  const pieces: DebrisPiece[] = []
  for (let i = 0; i < count; i++) {
    // Hemisphere biased up and away from the strike (the slam drives down and out).
    const a = rng() * Math.PI * 2
    const up = 0.15 + rng() * 0.85
    const r = Math.sqrt(1 - up * up)
    pieces.push({
      dir: new Vector3(Math.cos(a) * r, up, Math.sin(a) * r * 0.8),
      speed: (2.2 + Math.pow(rng(), 1.6) * 9) * speedScale,
      size: 0.04 + Math.pow(rng(), 2.5) * 0.2,
      spinAxis: new Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(),
      spin: 4 + rng() * 14,
      absorbed: rng() < absorbedFraction,
      delay: rng() * 0.05,
      seed: rng(),
    })
  }
  return pieces
}

/** Position + spin angle of a piece `t` seconds after contact. Returns the angle. */
export function debrisAt(p: DebrisPiece, origin: Vector3, t: number, out: Vector3): number {
  const tt = Math.max(0, t - p.delay)
  const vx = p.dir.x * p.speed
  const vy = p.dir.y * p.speed
  const vz = p.dir.z * p.speed
  const y0 = origin.y
  const rest = p.size * 0.5
  // Time it reaches the floor: y0 + vy t - G t²/2 = rest.
  const tHit = (vy + Math.sqrt(vy * vy + 2 * G * Math.max(y0 - rest, 0))) / G
  if (tt <= tHit) {
    out.set(origin.x + vx * tt, y0 + vy * tt - 0.5 * G * tt * tt, origin.z + vz * tt)
    return p.spin * tt
  }
  const s = tt - tHit
  const slide = (1 - Math.exp(-FLOOR_FRICTION * s)) / FLOOR_FRICTION
  const hop = Math.abs(Math.sin(s * 9)) * Math.exp(-s * 6) * 0.25 * p.speed * 0.1
  out.set(origin.x + vx * (tHit + slide * 0.5), rest + hop, origin.z + vz * (tHit + slide * 0.5))
  return p.spin * (tHit + slide)
}
