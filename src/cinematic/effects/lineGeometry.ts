import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import { createRng, type Rng } from '../../utils/random'

/**
 * Builds LineSegments geometry where every segment is a rigid "fragment" carrying:
 *  aScatter (vec3)  where the fragment flies in from during reconstruction
 *  aOrder   (float) stagger order 0..1
 *  aGlow    (float) per-part intensity
 * Shared by VELOCITY (reconstruction) and VOID (fragment glitching).
 */
export class LineBuilder {
  private readonly positions: number[] = []
  private readonly scatter: number[] = []
  private readonly order: number[] = []
  private readonly glow: number[] = []
  readonly rng: Rng

  constructor(seed: number) {
    this.rng = createRng(seed)
  }

  segment(a: Vector3, b: Vector3, glow = 1, scatterRadius = 1, order?: number): this {
    const r = this.rng
    const dir = new Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(scatterRadius * (0.4 + r()))
    const o = order ?? r()
    for (const p of [a, b]) {
      this.positions.push(p.x, p.y, p.z)
      this.scatter.push(dir.x, dir.y, dir.z)
      this.order.push(o)
      this.glow.push(glow)
    }
    return this
  }

  /** Polyline as consecutive segments. */
  polyline(points: Vector3[], glow = 1, scatterRadius = 1, closed = false): this {
    const n = closed ? points.length : points.length - 1
    for (let i = 0; i < n; i++) this.segment(points[i], points[(i + 1) % points.length], glow, scatterRadius)
    return this
  }

  build(): BufferGeometry {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3))
    g.setAttribute('aScatter', new BufferAttribute(new Float32Array(this.scatter), 3))
    g.setAttribute('aOrder', new BufferAttribute(new Float32Array(this.order), 1))
    g.setAttribute('aGlow', new BufferAttribute(new Float32Array(this.glow), 1))
    g.computeBoundingSphere()
    return g
  }
}
