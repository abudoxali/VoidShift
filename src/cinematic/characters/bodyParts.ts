import { BufferGeometry, CylinderGeometry, EdgesGeometry, LineSegments, Mesh, OctahedronGeometry, type Material } from 'three'

/**
 * Procedural body-part geometry. Limb segments hang from the joint along -Y; torso segments rise
 * along +Y. Faceted (low radial counts) on purpose: the silhouette must read as constructed.
 */
export function limb(length: number, rTop: number, rBottom: number, sides = 6): BufferGeometry {
  const g = new CylinderGeometry(rTop, rBottom, length, sides, 1)
  g.translate(0, -length / 2, 0)
  return g
}

export function column(length: number, rBottom: number, rTop: number, sides = 6): BufferGeometry {
  const g = new CylinderGeometry(rTop, rBottom, length, sides, 1)
  g.translate(0, length / 2, 0)
  return g
}

export function gem(sx: number, sy: number, sz: number): BufferGeometry {
  const g = new OctahedronGeometry(1, 0)
  g.scale(sx, sy, sz)
  return g
}

export interface PartOptions {
  edges?: Material | null
  edgeAngle?: number
}

/** A solid part with optional crisp edge lines (the vector/wireframe identity). */
export function part(geometry: BufferGeometry, material: Material, options: PartOptions = {}): Mesh {
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  if (options.edges) {
    const lines = new LineSegments(new EdgesGeometry(geometry, options.edgeAngle ?? 20), options.edges)
    lines.frustumCulled = false
    mesh.add(lines)
  }
  return mesh
}

/** Dispose every geometry under a root (materials are owned and disposed by the fighter). */
export function disposeGeometries(root: { traverse: (fn: (o: unknown) => void) => void }): void {
  root.traverse((o) => {
    const g = (o as { geometry?: BufferGeometry }).geometry
    g?.dispose()
  })
}
