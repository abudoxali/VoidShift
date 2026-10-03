import { IcosahedronGeometry, Vector3 } from 'three'
import { LineBuilder } from '../../effects/lineGeometry'

/**
 * Unique edges of a geodesic sphere, each edge an independent fragment. The VOID's shell is a
 * lattice that has lost its integrity: edges glitch, drop out and are displaced individually.
 */
export function buildShellGeometry(radius: number, detail: number, seed: number) {
  const ico = new IcosahedronGeometry(radius, detail)
  const pos = ico.getAttribute('position')
  const seen = new Set<string>()
  const b = new LineBuilder(seed)
  const a = new Vector3()
  const c = new Vector3()
  const key = (p: Vector3) => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`
  for (let t = 0; t < pos.count; t += 3) {
    for (let e = 0; e < 3; e++) {
      a.fromBufferAttribute(pos, t + e)
      c.fromBufferAttribute(pos, t + ((e + 1) % 3))
      const ka = key(a)
      const kc = key(c)
      const k = ka < kc ? ka + '|' + kc : kc + '|' + ka
      if (seen.has(k)) continue
      seen.add(k)
      b.segment(a.clone(), c.clone(), 1, radius * 1.2)
    }
  }
  ico.dispose()
  return b.build()
}
