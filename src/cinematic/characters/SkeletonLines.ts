import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, LineBasicMaterial, LineSegments, Quaternion, Vector3 } from 'three'
import type { CharacterRig } from '../animation/CharacterRig'
import type { JointName } from '../animation/skeleton'

const BONES: Array<[JointName, JointName]> = [
  ['hips', 'spine'],
  ['spine', 'chest'],
  ['chest', 'neck'],
  ['neck', 'head'],
  ['chest', 'upperArmL'],
  ['upperArmL', 'foreArmL'],
  ['foreArmL', 'handL'],
  ['chest', 'upperArmR'],
  ['upperArmR', 'foreArmR'],
  ['foreArmR', 'handR'],
  ['hips', 'thighL'],
  ['thighL', 'shinL'],
  ['shinL', 'footL'],
  ['hips', 'thighR'],
  ['thighR', 'shinR'],
  ['shinR', 'footR'],
]

/**
 * The rig drawn as glowing bones: the first stage of a reconstruction (energy skeleton → body
 * fragments → body), and the review-mode skeleton debug view. One draw call.
 */
export class SkeletonLines {
  readonly lines: LineSegments<BufferGeometry, LineBasicMaterial>
  private readonly positions: Float32Array
  private readonly a = new Vector3()
  private readonly b = new Vector3()

  constructor(color: readonly [number, number, number]) {
    this.positions = new Float32Array((BONES.length + 2) * 2 * 3)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage))
    const m = new LineBasicMaterial({ color: new Color(...color), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, depthTest: false })
    this.lines = new LineSegments(g, m)
    this.lines.frustumCulled = false
    this.lines.renderOrder = 20
  }

  /** Rig matrices must be current. */
  update(rig: CharacterRig, opacity: number): void {
    this.lines.visible = opacity > 0.003
    this.lines.material.opacity = Math.min(1, opacity)
    if (!this.lines.visible) return
    let k = 0
    for (const [p, c] of BONES) {
      rig.jointWorld(p, this.a)
      rig.jointWorld(c, this.b)
      this.positions.set([this.a.x, this.a.y, this.a.z, this.b.x, this.b.y, this.b.z], k)
      k += 6
    }
    // Head top and toe extensions so the figure reads as a full body.
    rig.jointWorld('head', this.a)
    this.b.set(0, rig.proportions.head, 0).applyQuaternion(rig.joints.head.getWorldQuaternion(QUAT)).add(this.a)
    this.positions.set([this.a.x, this.a.y, this.a.z, this.b.x, this.b.y, this.b.z], k)
    k += 6
    rig.jointWorld('footL', this.a)
    this.b.set(0, -0.03, 0.18).applyQuaternion(rig.joints.footL.getWorldQuaternion(QUAT)).add(this.a)
    this.positions.set([this.a.x, this.a.y, this.a.z, this.b.x, this.b.y, this.b.z], k)
    this.lines.geometry.getAttribute('position').needsUpdate = true
  }

  dispose(): void {
    this.lines.geometry.dispose()
    this.lines.material.dispose()
  }
}

const QUAT = new Quaternion()
