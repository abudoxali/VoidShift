import { Group, Skeleton, SkinnedMesh, type MeshStandardMaterial } from 'three'
import type { CharacterRig } from '../../animation/CharacterRig'
import { JOINTS } from '../../animation/skeleton'
import type { CharacterDesign } from './design'
import { applyBindPose } from './frames'
import type { CharacterGeometry } from './generate'
import { createFighterMaterial, createFighterUniforms, type FighterUniforms, type MaterialKind } from './material'

/** GLSL bodies of the design's paint pass, per mesh kind (see `vsPaint` in material.ts). */
export type PaintSet = Partial<Record<MaterialKind, string>>

const KINDS: readonly MaterialKind[] = ['body', 'head', 'hair', 'armor']

/**
 * A fighter's renderable body: four skinned meshes (body + hands, head, hair, armour) bound to
 * the rig's bones in the A-pose bind, sharing one skeleton and one uniform block. The pose system
 * keeps driving the bones; this class only renders them. Four draws per fighter.
 *
 * Construction has no scene-graph side effects (safe in useMemo); `attach` parents the meshes.
 */
export class SculptedFighter {
  readonly group = new Group()
  readonly uniforms: FighterUniforms
  readonly meshes: Record<MaterialKind, SkinnedMesh>
  readonly materials: Record<MaterialKind, MeshStandardMaterial>
  readonly skeleton: Skeleton
  readonly geometry: CharacterGeometry

  constructor(
    readonly design: CharacterDesign,
    rig: CharacterRig,
    geometry: CharacterGeometry,
    paint: PaintSet = {},
  ) {
    this.geometry = geometry
    this.uniforms = createFighterUniforms(design)
    // Bone inverses are taken in the bind pose (the Skeleton constructor computes them).
    applyBindPose(rig)
    rig.root.updateMatrixWorld(true)
    this.skeleton = new Skeleton(JOINTS.map((j) => rig.joints[j]))
    const materials = {} as Record<MaterialKind, MeshStandardMaterial>
    const meshes = {} as Record<MaterialKind, SkinnedMesh>
    for (const kind of KINDS) {
      const mat = createFighterMaterial(design, kind, this.uniforms, paint[kind] ?? '', this.geometry.headBind)
      const mesh = new SkinnedMesh(this.geometry[kind], mat)
      // Unnamed: draws are attributed to the fighter object that holds the rig (review breakdown).
      mesh.userData.kind = kind
      mesh.frustumCulled = false
      this.group.add(mesh)
      // Bind in character space: the bind matrix is the rig root at bind time, wherever the
      // mesh group ends up in the scene graph (attached bind mode).
      mesh.bind(this.skeleton, rig.root.matrixWorld)
      materials[kind] = mat
      meshes[kind] = mesh
    }
    this.materials = materials
    this.meshes = meshes
  }

  get triangles(): number {
    return this.geometry.stats.triangles
  }

  /** Parents the meshes under the rig root (call from an effect, not during render). */
  attach(rig: CharacterRig): void {
    rig.root.add(this.group)
  }

  setWireframe(on: boolean): void {
    for (const m of Object.values(this.materials)) m.wireframe = on
  }

  /** Frees GPU resources. Geometry stays cached CPU-side and is re-uploaded if used again. */
  dispose(): void {
    this.group.removeFromParent()
    for (const kind of KINDS) {
      this.materials[kind].dispose()
      this.geometry[kind].dispose()
    }
    this.skeleton.dispose()
  }
}
