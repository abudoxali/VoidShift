import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
} from 'three'
import { useCinematicEngine } from '../engine/CinematicContext'
import { FRAME_STAGE } from '../engine/frameStages'
import { createRng } from '../../utils/random'

interface Block {
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  ry: number
  rz: number
  strip: boolean
}

/** Arena centre (between the fighters' final marks). Structures ring it, mostly behind. */
const CX = 1.4

function layout(): Block[] {
  const rng = createRng(1907)
  const blocks: Block[] = []
  // Monoliths: a broken ring, denser behind the action, sparse in front (reverse shots).
  for (let i = 0; i < 26; i++) {
    const behind = i < 18
    const a = behind ? Math.PI * (1.08 + rng() * 0.84) : rng() * Math.PI * 2
    const r = behind ? 12 + rng() * 18 : 16 + rng() * 12
    const x = CX + Math.cos(a) * r
    const z = Math.sin(a) * r * (behind ? 0.9 : 1)
    if (!behind && z < 6) continue
    const h = (2 + Math.pow(rng(), 1.4) * 10) * Math.min(1, r / 18)
    blocks.push({ x, y: h / 2, z, w: 0.5 + rng() * 1.4, h, d: 0.35 + rng() * 1.0, ry: rng() * Math.PI, rz: (rng() - 0.5) * 0.08, strip: rng() < 0.45 })
  }
  // Floating slabs: high, tilted, catching the rim light.
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * (1.0 + rng() * 1.0)
    const r = 11 + rng() * 14
    blocks.push({ x: CX + Math.cos(a) * r, y: 3.5 + rng() * 5, z: Math.sin(a) * r, w: 1.5 + rng() * 3.5, h: 0.12 + rng() * 0.2, d: 0.8 + rng() * 2.2, ry: rng() * Math.PI, rz: (rng() - 0.5) * 0.5, strip: rng() < 0.3 })
  }
  return blocks
}

/**
 * Dimensional structures: dark monoliths and floating slabs with crisp edges and a few dim light
 * strips. They give the arena depth, scale and silhouettes for the rim lights to catch; they
 * rise out of the floor during the reveal.
 */
export function Structures() {
  const engine = useCinematicEngine()

  const parts = useMemo(() => {
    const blocks = layout()
    const root = new Group()
    const unit = new BoxGeometry(1, 1, 1)
    const mat = new MeshStandardMaterial({ color: 0x0e1a1f, metalness: 0.3, roughness: 0.55, flatShading: true })
    const mesh = new InstancedMesh(unit, mat, blocks.length)
    const o = new Object3D()
    const m = new Matrix4()

    // Edges of every block merged into one static line geometry.
    const unitEdges = new EdgesGeometry(unit)
    const ep = unitEdges.getAttribute('position')
    const edgePos = new Float32Array(blocks.length * ep.count * 3)
    const stripMat = new MeshBasicMaterial({ color: new Color(0.25, 0.85, 1.05) })
    const stripGeo = new BoxGeometry(1, 1, 1)
    const strips = new InstancedMesh(stripGeo, stripMat, blocks.length)
    let stripCount = 0

    blocks.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z)
      o.rotation.set(0, b.ry, b.rz)
      o.scale.set(b.w, b.h, b.d)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      m.copy(o.matrix)
      for (let v = 0; v < ep.count; v++) {
        const x = ep.getX(v), y = ep.getY(v), z = ep.getZ(v)
        const e = m.elements
        const k = (i * ep.count + v) * 3
        edgePos[k] = e[0] * x + e[4] * y + e[8] * z + e[12]
        edgePos[k + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]
        edgePos[k + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]
      }
      if (b.strip) {
        // A thin vertical light strip on the face toward the arena.
        o.scale.set(0.035, b.h * 0.8, 0.035)
        o.position.set(b.x, b.y, b.z)
        o.updateMatrix()
        const offset = new Matrix4().makeTranslation(0, 0, b.d * 0.5 + 0.02)
        const local = new Matrix4().compose(o.position, o.quaternion, o.scale.set(1, 1, 1))
        const scale = new Matrix4().makeScale(0.035, b.h * 0.8, 0.035)
        strips.setMatrixAt(stripCount++, local.multiply(offset).multiply(scale))
      }
    })
    strips.count = stripCount
    const edgeGeo = new BufferGeometry()
    edgeGeo.setAttribute('position', new BufferAttribute(edgePos, 3))
    const edgeMat = new LineBasicMaterial({ color: new Color(0.07, 0.22, 0.27), transparent: true })
    const edges = new LineSegments(edgeGeo, edgeMat)
    unitEdges.dispose()
    root.add(mesh, edges, strips)
    root.traverse((c) => (c.frustumCulled = false))
    return { root, mesh, mat, edges, edgeMat, edgeGeo, unit, strips, stripMat, stripGeo }
  }, [])

  useEffect(
    () => () => {
      for (const g of [parts.unit, parts.edgeGeo, parts.stripGeo]) g.dispose()
      for (const mm of [parts.mat, parts.edgeMat, parts.stripMat]) mm.dispose()
    },
    [parts],
  )

  useFrame(() => {
    const s = engine.state.world.structures
    parts.root.visible = s > 0.001
    // Rise out of the floor.
    const k = 1 - Math.pow(1 - s, 3)
    parts.root.scale.set(1, Math.max(k, 1e-3), 1)
    parts.edgeMat.opacity = s
    const flick = 0.85 + 0.15 * Math.sin(engine.elapsed * 3.1)
    parts.stripMat.color.setRGB(0.25 * s * flick, 0.85 * s * flick, 1.05 * s * flick)
  }, FRAME_STAGE.WORLD)

  return <primitive name="structures" object={parts.root} dispose={null} />
}
