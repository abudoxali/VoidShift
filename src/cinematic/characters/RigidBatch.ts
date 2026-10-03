import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  Group,
  LineSegments,
  Mesh,
  RGBAFormat,
  type Material,
  type Object3D,
  type WebGLProgramParametersWithUniforms,
  type WebGLRenderer,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

type Drawable = Mesh | LineSegments

/**
 * Draw-call batching for an articulated fighter (rigid skinning).
 *
 * Every body part stays where it is in the joint hierarchy, so pose and FX code keep animating
 * plain Object3Ds. Drawing goes through one merged geometry per material: each merged vertex
 * carries the index of its part, and the vertex shader reads that part's world matrix from a
 * small float texture that is refreshed once per frame. ~50 draws per fighter become 3–5.
 *
 * Parts whose material is invisible are skipped (they never draw). Batched originals are hidden.
 */
export class RigidBatch {
  readonly group = new Group()
  private readonly parts: Object3D[] = []
  private readonly data: Float32Array
  private readonly texture: DataTexture
  private readonly geometries: BufferGeometry[] = []

  constructor(
    private readonly root: Object3D,
    name: string,
    /** The body's materials (documents the build-order dependency; all parts are found by traversal). */
    _materials?: Record<string, Material>,
  ) {
    this.group.name = name
    root.updateMatrixWorld(true)
    const batches = new Map<Material, { line: boolean; items: BufferGeometry[] }>()
    root.traverse((o) => {
      const d = o as Drawable
      if (!(d as Mesh).isMesh && !(d as LineSegments).isLineSegments) return
      const material = d.material as Material
      if (Array.isArray(d.material) || material.visible === false) return
      const index = this.parts.push(d) - 1
      const source = d.geometry.index ? d.geometry.toNonIndexed() : d.geometry.clone()
      const g = new BufferGeometry()
      g.setAttribute('position', source.getAttribute('position'))
      const line = Boolean((d as LineSegments).isLineSegments)
      if (!line && source.getAttribute('normal')) g.setAttribute('normal', source.getAttribute('normal'))
      source.dispose()
      const count = g.getAttribute('position').count
      g.setAttribute('aPart', new BufferAttribute(new Float32Array(count).fill(index), 1))
      const entry = batches.get(material) ?? { line, items: [] }
      entry.items.push(g)
      batches.set(material, entry)
    })
    // Hide the originals only after collecting (an edge child must not inherit a hidden flag
    // before it is visited).
    for (const p of this.parts) p.visible = false

    this.data = new Float32Array(Math.max(1, this.parts.length) * 16)
    this.texture = new DataTexture(this.data, 4, Math.max(1, this.parts.length), RGBAFormat, FloatType)
    this.texture.needsUpdate = true

    for (const [material, { line, items }] of batches) {
      const merged = mergeGeometries(items, false)
      items.forEach((g) => g.dispose())
      if (!merged) continue
      this.geometries.push(merged)
      installRigidSkinning(material, this.texture)
      const object = line ? new LineSegments(merged, material) : new Mesh(merged, material)
      object.frustumCulled = false
      object.name = name
      this.group.add(object)
    }
    this.update()
  }

  get partCount(): number {
    return this.parts.length
  }

  get drawCount(): number {
    return this.group.children.length
  }

  /** Copy every part's world matrix to the texture. Call after the rig has been posed. */
  update(visible = true): void {
    this.group.visible = visible
    if (!visible) return
    this.root.updateMatrixWorld(true)
    for (let i = 0; i < this.parts.length; i++) this.parts[i].matrixWorld.toArray(this.data, i * 16)
    this.texture.needsUpdate = true
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose())
    this.texture.dispose()
  }
}

/** Chains a rigid-skinning vertex transform onto a material's existing shader hooks. */
function installRigidSkinning(material: Material, texture: DataTexture): void {
  const previous = material.onBeforeCompile
  const previousKey = material.customProgramCacheKey.bind(material)
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => {
    previous.call(material, shader, renderer)
    shader.uniforms.uPartMatrices = { value: texture }
    shader.vertexShader =
      `attribute float aPart;
uniform highp sampler2D uPartMatrices;
mat4 vsPartMatrix() {
  int row = int(aPart + 0.5);
  return mat4(texelFetch(uPartMatrices, ivec2(0, row), 0), texelFetch(uPartMatrices, ivec2(1, row), 0),
              texelFetch(uPartMatrices, ivec2(2, row), 0), texelFetch(uPartMatrices, ivec2(3, row), 0));
}
` +
      shader.vertexShader
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  objectNormal = mat3(vsPartMatrix()) * objectNormal;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed = (vsPartMatrix() * vec4(transformed, 1.0)).xyz;')
  }
  material.customProgramCacheKey = () => `${previousKey()}-rigid`
}
