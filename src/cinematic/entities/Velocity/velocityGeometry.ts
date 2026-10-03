import { Vector3 } from 'three'
import { LineBuilder } from '../../effects/lineGeometry'

const v = (x: number, y: number, z: number) => new Vector3(x, y, z)

/**
 * The vector kernel: an elongated, faceted direction form (nose on +X) with an inner frame
 * rotated 45°, an exhaust vector with measurement ticks and a chevron ahead of the nose.
 * Reads as "a direction with magnitude", never as a body.
 */
export function buildKernelGeometry() {
  const b = new LineBuilder(1701)
  const facet = (scale: number, rot: number, glow: number) => {
    const nose = v(1.15 * scale, 0, 0)
    const tail = v(-0.55 * scale, 0, 0)
    const ring: Vector3[] = []
    for (let k = 0; k < 4; k++) {
      const a = rot + (k * Math.PI) / 2
      ring.push(v(0.05 * scale, Math.cos(a) * 0.3 * scale, Math.sin(a) * 0.3 * scale))
    }
    for (let k = 0; k < 4; k++) {
      b.segment(nose, ring[k], glow, 2.2)
      b.segment(tail, ring[k], glow * 0.8, 2.2)
      b.segment(ring[k], ring[(k + 1) % 4], glow * 0.7, 2.2)
    }
  }
  facet(1, 0, 1)
  facet(0.55, Math.PI / 4, 1.7)

  // Exhaust vector with measurement ticks.
  b.segment(v(-0.62, 0, 0), v(-1.75, 0, 0), 0.55, 3)
  for (const x of [-0.95, -1.25, -1.55]) {
    b.segment(v(x, -0.05, 0), v(x, 0.05, 0), 0.6, 3)
  }
  // Chevron ahead of the nose: the direction indicator.
  b.segment(v(1.42, 0.13, 0), v(1.58, 0, 0), 1.3, 3)
  b.segment(v(1.42, -0.13, 0), v(1.58, 0, 0), 1.3, 3)
  return b.build()
}

/**
 * A precision ring: dashed circle with outward ticks (gyroscope / measurement instrument).
 */
export function buildRingGeometry(radius: number, dashes: number, ticks: number, seed: number) {
  const b = new LineBuilder(seed)
  const slot = (Math.PI * 2) / dashes
  for (let i = 0; i < dashes; i++) {
    const a0 = i * slot
    const a1 = a0 + slot * 0.62
    const steps = 3
    const pts: Vector3[] = []
    for (let s = 0; s <= steps; s++) {
      const a = a0 + ((a1 - a0) * s) / steps
      pts.push(v(Math.cos(a) * radius, 0, Math.sin(a) * radius))
    }
    b.polyline(pts, 0.6, 2.5)
  }
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    b.segment(v(c * radius * 1.04, 0, s * radius * 1.04), v(c * radius * 1.16, 0, s * radius * 1.16), 1.1, 2.5)
  }
  return b.build()
}

/**
 * Ground projection of the arrival coordinate: reticle on the floor plus a dashed
 * plumb line up to the target height. Placed in world space by the entity.
 */
export function buildTargetGeometry(height: number) {
  const b = new LineBuilder(77)
  const r = 0.42
  const pts: Vector3[] = []
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2
    pts.push(v(Math.cos(a) * r, 0, Math.sin(a) * r))
  }
  b.polyline(pts, 0.7, 1.5)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const c = Math.cos(a)
    const s = Math.sin(a)
    b.segment(v(c * r * 0.55, 0, s * r * 0.55), v(c * r * 1.35, 0, s * r * 1.35), 1, 1.5)
  }
  const dashes = 9
  for (let i = 0; i < dashes; i++) {
    const y0 = (i / dashes) * height
    b.segment(v(0, y0, 0), v(0, y0 + (height / dashes) * 0.55, 0), 0.8, 1.5)
  }
  return b.build()
}
