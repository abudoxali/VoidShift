import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { createDebris, debrisAt } from './debris'

describe('impact debris', () => {
  const origin = new Vector3(2.5, 1.45, 0)

  it('is deterministic per seed', () => {
    const a = createDebris(40, 7, 0.3)
    const b = createDebris(40, 7, 0.3)
    expect(a).toEqual(b)
    const p = new Vector3()
    const q = new Vector3()
    debrisAt(a[5], origin, 0.8, p)
    debrisAt(b[5], origin, 0.8, q)
    expect(p.equals(q)).toBe(true)
  })

  it('leaves the contact point, rises, falls and comes to rest on the floor', () => {
    const pieces = createDebris(60, 11, 0)
    const p = new Vector3()
    for (const piece of pieces) {
      debrisAt(piece, origin, 0, p)
      expect(p.distanceTo(origin)).toBeLessThan(1e-9)
      for (const t of [0.05, 0.3, 1, 3, 6]) {
        debrisAt(piece, origin, t, p)
        expect(p.y).toBeGreaterThanOrEqual(0)
      }
      debrisAt(piece, origin, 6, p)
      const rest = p.clone()
      debrisAt(piece, origin, 7, p)
      expect(p.distanceTo(rest)).toBeLessThan(0.01)
      expect(rest.y).toBeLessThan(piece.size)
    }
  })

  it('marks roughly the requested fraction as absorbed back into VOID', () => {
    const pieces = createDebris(400, 3, 0.25)
    const absorbed = pieces.filter((p) => p.absorbed).length / pieces.length
    expect(absorbed).toBeGreaterThan(0.18)
    expect(absorbed).toBeLessThan(0.32)
  })
})
