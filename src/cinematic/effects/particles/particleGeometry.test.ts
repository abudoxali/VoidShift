import { Sphere, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { buildParticleGeometry, setParticleCount } from './particleGeometry'

const bounds = new Sphere(new Vector3(), 10)

describe('buildParticleGeometry', () => {
  it('allocates per-vertex attributes and duplicates particle data across vertices', () => {
    const g = buildParticleGeometry({
      capacity: 4,
      seed: 1,
      verticesPerParticle: 2,
      bounds,
      attributes: { aSeed: 2 },
      init(w, i) {
        w.set('position', i, i * 2, i * 3)
        w.set('aSeed', i + 0.5, 9)
      },
    })
    expect(g.getAttribute('position').count).toBe(8)
    expect(g.getAttribute('aSeed').getX(5)).toBe(2.5)
    expect(g.getAttribute('aSeed').getX(4)).toBe(2.5)
    expect(g.getAttribute('aVertex').getX(4)).toBe(0)
    expect(g.getAttribute('aVertex').getX(5)).toBe(1)
    setParticleCount(g, 3)
    expect(g.drawRange.count).toBe(6)
  })

  it('makes any prefix independent of capacity (quality changes keep the same world)', () => {
    const make = (capacity: number) =>
      buildParticleGeometry({
        capacity,
        seed: 99,
        bounds,
        attributes: {},
        init(w, _i, rng) {
          w.set('position', rng(), rng(), rng())
        },
      })
    const small = make(100).getAttribute('position').array
    const large = make(1000).getAttribute('position').array
    expect(Array.from(large.slice(0, small.length))).toEqual(Array.from(small))
  })
})
