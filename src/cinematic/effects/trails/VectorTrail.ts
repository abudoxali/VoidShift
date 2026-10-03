import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Mesh,
  ShaderMaterial,
  Vector2,
  type Vector3,
} from 'three'
import { TrailBuffer } from './TrailBuffer'
import fragmentShader from './trail.frag.glsl?raw'
import vertexShader from './trail.vert.glsl?raw'

export interface VectorTrailOptions {
  length: number
  /** Width at the head, in CSS-independent drawing-buffer pixels. */
  width: number
  color: readonly [number, number, number]
}

/**
 * Screen-space ribbon following a moving point (motion streaks, teleport wakes).
 * One mesh, one draw call, 3 small attribute uploads per frame; no allocation per frame.
 */
export class VectorTrail {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>
  private readonly buffer: TrailBuffer
  private readonly pos: BufferAttribute
  private readonly prev: BufferAttribute
  private readonly next: BufferAttribute
  private readonly point = new Float32Array(3)

  constructor({ length, width, color }: VectorTrailOptions) {
    this.buffer = new TrailBuffer(length)
    const verts = length * 2
    const geometry = new BufferGeometry()
    const mk = () => new BufferAttribute(new Float32Array(verts * 3), 3).setUsage(DynamicDrawUsage)
    this.pos = mk()
    this.prev = mk()
    this.next = mk()
    const side = new Float32Array(verts)
    const age = new Float32Array(verts)
    for (let i = 0; i < length; i++) {
      side[i * 2] = -1
      side[i * 2 + 1] = 1
      age[i * 2] = age[i * 2 + 1] = i / (length - 1)
    }
    const index: number[] = []
    for (let i = 0; i < length - 1; i++) {
      const a = i * 2
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    geometry.setIndex(index)
    geometry.setAttribute('position', this.pos)
    geometry.setAttribute('aPrev', this.prev)
    geometry.setAttribute('aNext', this.next)
    geometry.setAttribute('aSide', new BufferAttribute(side, 1))
    geometry.setAttribute('aAge', new BufferAttribute(age, 1))

    const material = new ShaderMaterial({
      uniforms: {
        uResolution: { value: new Vector2(1, 1) },
        uWidth: { value: width },
        uColor: { value: color },
        uOpacity: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    this.mesh = new Mesh(geometry, material)
    this.mesh.frustumCulled = false
  }

  reset(p: Vector3): void {
    this.buffer.reset(p)
    this.write()
  }

  push(p: Vector3): void {
    this.buffer.push(p)
    this.write()
  }

  setOpacity(value: number): void {
    this.mesh.material.uniforms.uOpacity.value = value
  }

  setResolution(width: number, height: number): void {
    ;(this.mesh.material.uniforms.uResolution.value as Vector2).set(width, height)
  }

  private write(): void {
    const n = this.buffer.length
    const pos = this.pos.array as Float32Array
    const prev = this.prev.array as Float32Array
    const next = this.next.array as Float32Array
    for (let i = 0; i < n; i++) {
      this.buffer.read(i, this.point, 0)
      const o = i * 6
      pos.set(this.point, o)
      pos.set(this.point, o + 3)
      this.buffer.read(Math.max(i - 1, 0), this.point, 0)
      prev.set(this.point, o)
      prev.set(this.point, o + 3)
      this.buffer.read(Math.min(i + 1, n - 1), this.point, 0)
      next.set(this.point, o)
      next.set(this.point, o + 3)
    }
    this.pos.needsUpdate = true
    this.prev.needsUpdate = true
    this.next.needsUpdate = true
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
