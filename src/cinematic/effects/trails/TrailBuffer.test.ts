import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { TrailBuffer } from './TrailBuffer'

describe('TrailBuffer', () => {
  it('reads newest first and wraps around', () => {
    const t = new TrailBuffer(3)
    t.reset(new Vector3(0, 0, 0))
    t.push(new Vector3(1, 0, 0))
    t.push(new Vector3(2, 0, 0))
    t.push(new Vector3(3, 0, 0))
    t.push(new Vector3(4, 0, 0))
    const out = new Float32Array(3)
    const xs = [0, 1, 2].map((i) => (t.read(i, out, 0), out[0]))
    expect(xs).toEqual([4, 3, 2])
  })
})
