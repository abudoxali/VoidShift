import type { BufferGeometry } from 'three'

/** Dispose every geometry under a root (materials are owned and disposed by the fighter). */
export function disposeGeometries(root: { traverse: (fn: (o: unknown) => void) => void }): void {
  root.traverse((o) => {
    const g = (o as { geometry?: BufferGeometry }).geometry
    g?.dispose()
  })
}
