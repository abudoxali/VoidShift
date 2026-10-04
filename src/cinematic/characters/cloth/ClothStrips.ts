import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Mesh, Vector3, type Camera, type Material, type Object3D } from 'three'

/**
 * Secondary motion: cloth / ribbon strips simulated as Verlet chains (scarf, sash, cloak).
 *
 * Each strip is pinned to an anchor on the body and hangs freely: gravity, air drag and the body's
 * own motion (inertia) make it trail behind dashes, swing out of spins, snap on stops and settle
 * after landings. Body spheres keep it from passing through the torso. All strips of one system
 * render as a single dynamic ribbon mesh (one draw call).
 *
 * The simulation is secondary detail and not part of the deterministic state: it resets to a
 * settled pose on seeks and teleports.
 */
export interface StripSpec {
  anchor: Object3D
  /** Pin offset in the anchor's local space. */
  offset: Vector3
  length: number
  segments: number
  width: number
  /** Width at the free end, relative to `width`. */
  tipWidth?: number
  /** How the ribbon's width is oriented: across the body (anchor's local X) or facing the camera. */
  facing?: 'body' | 'camera'
  /** Rest direction (anchor local) the strip initially hangs toward. */
  rest?: Vector3
}

export interface Collider {
  center: Vector3
  radius: number
}

interface Strip {
  spec: StripSpec
  points: Vector3[]
  previous: Vector3[]
  segmentLength: number
}

const GRAVITY = new Vector3(0, -9.8, 0)
const tmp = new Vector3()
const tmp2 = new Vector3()
const side = new Vector3()
const along = new Vector3()

export class ClothStrips {
  readonly mesh: Mesh
  private readonly strips: Strip[]
  private readonly positions: Float32Array
  private readonly colors: Float32Array
  /** Extra acceleration (e.g. a wind kick from an impact). */
  readonly wind = new Vector3()
  drag = 1.6
  gravityScale = 1
  stiffness = 6

  constructor(specs: StripSpec[], material: Material, options: { gradient?: boolean } = {}) {
    this.strips = specs.map((spec) => {
      const n = spec.segments + 1
      return { spec, points: Array.from({ length: n }, () => new Vector3()), previous: Array.from({ length: n }, () => new Vector3()), segmentLength: spec.length / spec.segments }
    })
    const vertexCount = this.strips.reduce((a, s) => a + s.points.length * 2, 0)
    this.positions = new Float32Array(vertexCount * 3)
    this.colors = new Float32Array(vertexCount * 3)
    const indices: number[] = []
    let base = 0
    for (const s of this.strips) {
      for (let i = 0; i < s.points.length; i++) {
        const t = i / (s.points.length - 1)
        // Brightness ramp: bright at the root, fading toward the free end.
        const c = options.gradient ? 1 - t * 0.85 : 1
        for (let k = 0; k < 2; k++) this.colors.set([c, c, c], (base + i * 2 + k) * 3)
        if (i < s.points.length - 1) {
          const a = base + i * 2
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
        }
      }
      base += s.points.length * 2
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage))
    g.setAttribute('color', new BufferAttribute(this.colors, 3))
    g.setIndex(indices)
    this.mesh = new Mesh(g, material)
    this.mesh.frustumCulled = false
    this.reset()
  }

  /** Settle every strip hanging from its anchor (seek, teleport, first frame). */
  reset(): void {
    for (const s of this.strips) {
      s.spec.anchor.updateWorldMatrix(true, false)
      const root = tmp.copy(s.spec.offset).applyMatrix4(s.spec.anchor.matrixWorld)
      const dir = tmp2.copy(s.spec.rest ?? new Vector3(0, -1, -0.3)).transformDirection(s.spec.anchor.matrixWorld)
      dir.y = Math.min(dir.y, -0.4)
      dir.normalize()
      for (let i = 0; i < s.points.length; i++) {
        s.points[i].copy(root).addScaledVector(dir, i * s.segmentLength)
        s.previous[i].copy(s.points[i])
      }
    }
    this.settle()
  }

  /** Let the strips hang for a moment (no collisions) so a paused or seeked frame looks natural. */
  private settling = false
  settle(seconds = 0.8): void {
    if (this.settling) return
    this.settling = true
    for (let t = 0; t < seconds; t += 1 / 30) this.step(1 / 30, this.lastColliders)
    this.settling = false
  }

  /** Advance the simulation. `dt` is clamped and sub-stepped for stability. */
  private lastColliders: readonly Collider[] = []

  step(dt: number, colliders: readonly Collider[]): void {
    this.lastColliders = colliders
    const h = Math.min(Math.max(dt, 0), 1 / 20)
    if (h <= 0) return
    const sub = 3
    const d = h / sub
    for (let k = 0; k < sub; k++) {
      for (const s of this.strips) {
        s.spec.anchor.updateWorldMatrix(true, false)
        const root = tmp.copy(s.spec.offset).applyMatrix4(s.spec.anchor.matrixWorld)
        // A teleport (big jump of the anchor) resets instead of whipping across the stage.
        if (root.distanceToSquared(s.points[0]) > 1.0) {
          this.reset()
          return
        }
        s.points[0].copy(root)
        s.previous[0].copy(root)
        const damping = Math.exp(-this.drag * d)
        for (let i = 1; i < s.points.length; i++) {
          const p = s.points[i]
          const v = tmp2.subVectors(p, s.previous[i]).multiplyScalar(damping)
          s.previous[i].copy(p)
          p.add(v).addScaledVector(GRAVITY, this.gravityScale * d * d).addScaledVector(this.wind, d * d)
        }
        // Distance constraints (root → tip), then body collisions.
        for (let iter = 0; iter < this.stiffness; iter++) {
          for (let i = 1; i < s.points.length; i++) {
            const a = s.points[i - 1]
            const b = s.points[i]
            along.subVectors(b, a)
            const len = along.length() || 1e-6
            const diff = (len - s.segmentLength) / len
            if (i === 1) b.addScaledVector(along, -diff)
            else {
              a.addScaledVector(along, diff * 0.5)
              b.addScaledVector(along, -diff * 0.5)
            }
          }
          s.points[0].copy(root)
          for (let i = 1; i < s.points.length; i++) {
            for (const c of colliders) {
              along.subVectors(s.points[i], c.center)
              const dist = along.length()
              if (dist < c.radius && dist > 1e-6) s.points[i].addScaledVector(along, (c.radius - dist) / dist)
            }
          }
        }
      }
    }
  }

  /** Rebuild the ribbon vertices. `fade` scales width (0 hides). */
  write(camera: Camera, fade = 1): void {
    let v = 0
    const camPos = camera.position
    for (const s of this.strips) {
      const n = s.points.length
      // Width direction across the body: the anchor's local X axis.
      const bodySide = side.set(1, 0, 0).transformDirection(s.spec.anchor.matrixWorld)
      for (let i = 0; i < n; i++) {
        const p = s.points[i]
        const t = i / (n - 1)
        const w = s.spec.width * (1 + ((s.spec.tipWidth ?? 1) - 1) * t) * 0.5 * fade
        if (s.spec.facing === 'camera') {
          along.subVectors(s.points[Math.min(i + 1, n - 1)], s.points[Math.max(i - 1, 0)])
          tmp.subVectors(camPos, p)
          tmp2.crossVectors(along, tmp).normalize()
        } else tmp2.copy(bodySide)
        this.positions[v++] = p.x + tmp2.x * w
        this.positions[v++] = p.y + tmp2.y * w
        this.positions[v++] = p.z + tmp2.z * w
        this.positions[v++] = p.x - tmp2.x * w
        this.positions[v++] = p.y - tmp2.y * w
        this.positions[v++] = p.z - tmp2.z * w
      }
    }
    const g = this.mesh.geometry
    g.getAttribute('position').needsUpdate = true
    g.computeVertexNormals()
  }

  dispose(): void {
    this.mesh.geometry.dispose()
  }
}
