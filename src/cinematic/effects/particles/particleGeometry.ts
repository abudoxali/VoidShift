import { BufferAttribute, BufferGeometry, Sphere } from 'three'
import { createRng, type Rng } from '../../../utils/random'

export interface ParticleWriter<K extends string> {
  /** Writes the same value for every vertex of the current particle. */
  set(name: K | 'position', ...values: number[]): void
}

export interface ParticleGeometryOptions<K extends string> {
  /** Maximum particle count ever drawn (buffers are allocated once). */
  capacity: number
  seed: number
  /** Extra per-particle attributes and their item sizes. `position` (vec3) is implicit. */
  attributes: Record<K, number>
  /** Vertices per particle: 1 for point sprites, 2 for streak line segments. */
  verticesPerParticle?: 1 | 2
  /** Conservative bounds for culling (particles move on the GPU, so bounds are declared). */
  bounds: Sphere
  init(write: ParticleWriter<K>, index: number, rng: Rng): void
}

/**
 * GPU particle foundation: one BufferGeometry per particle system, stateless motion in the
 * vertex shader from per-particle seed attributes. Scales to 100k+ particles with a single
 * draw call. Particles consume the RNG in index order, so any prefix [0, n) is a uniform
 * subsample — quality changes only move the draw range (see `setParticleCount`).
 *
 * When `verticesPerParticle` is 2, an `aVertex` attribute (0 = head, 1 = tail) is added.
 */
export function buildParticleGeometry<K extends string>(options: ParticleGeometryOptions<K>): BufferGeometry {
  const { capacity, seed, attributes, bounds, init } = options
  const vpp = options.verticesPerParticle ?? 1
  const vertexCount = capacity * vpp
  const sizes: Record<string, number> = { position: 3, ...attributes }
  const arrays: Record<string, Float32Array> = {}
  for (const [name, size] of Object.entries(sizes)) arrays[name] = new Float32Array(vertexCount * size)

  let current = 0
  const writer: ParticleWriter<K> = {
    set(name, ...values) {
      const size = sizes[name]
      const array = arrays[name]
      for (let v = 0; v < vpp; v++) {
        const base = (current * vpp + v) * size
        for (let c = 0; c < size; c++) array[base + c] = values[c] ?? 0
      }
    },
  }

  const rng = createRng(seed)
  for (current = 0; current < capacity; current++) init(writer, current, rng)

  const geometry = new BufferGeometry()
  for (const [name, size] of Object.entries(sizes)) geometry.setAttribute(name, new BufferAttribute(arrays[name], size))
  if (vpp === 2) {
    const ends = new Float32Array(vertexCount)
    for (let i = 0; i < vertexCount; i++) ends[i] = i % 2
    geometry.setAttribute('aVertex', new BufferAttribute(ends, 1))
  }
  geometry.boundingSphere = bounds.clone()
  geometry.userData.verticesPerParticle = vpp
  return geometry
}

export function setParticleCount(geometry: BufferGeometry, count: number): void {
  const vpp = (geometry.userData.verticesPerParticle as number | undefined) ?? 1
  geometry.setDrawRange(0, count * vpp)
}
