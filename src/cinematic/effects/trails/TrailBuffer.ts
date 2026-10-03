import type { Vector3 } from 'three'

/**
 * Fixed-size ring buffer of world positions (newest first when read). Zero allocation
 * after construction; feeds the ribbon geometry of a VectorTrail.
 */
export class TrailBuffer {
  readonly length: number
  private readonly data: Float32Array
  private head = 0

  constructor(length: number) {
    this.length = length
    this.data = new Float32Array(length * 3)
  }

  /** Collapse the whole history onto one point (spawn, teleport, seek). */
  reset(p: Vector3): void {
    for (let i = 0; i < this.length; i++) {
      this.data[i * 3] = p.x
      this.data[i * 3 + 1] = p.y
      this.data[i * 3 + 2] = p.z
    }
    this.head = 0
  }

  push(p: Vector3): void {
    this.head = (this.head - 1 + this.length) % this.length
    const o = this.head * 3
    this.data[o] = p.x
    this.data[o + 1] = p.y
    this.data[o + 2] = p.z
  }

  /** Writes point i (0 = newest) into out[offset..offset+2]. */
  read(i: number, out: Float32Array, offset: number): void {
    const o = ((this.head + i) % this.length) * 3
    out[offset] = this.data[o]
    out[offset + 1] = this.data[o + 1]
    out[offset + 2] = this.data[o + 2]
  }
}
