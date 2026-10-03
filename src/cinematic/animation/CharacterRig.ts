import { Group, Matrix4, Quaternion, Vector3, type Object3D } from 'three'
import { blendPoses, type CompiledPose, type HandShape } from './pose'
import { JOINTS, JOINT_INDEX, PARENT, jointOffsets, type JointName, type Proportions } from './skeleton'

export interface ProceduralLayers {
  /** World clock, for breathing. */
  time: number
  /** 0..1 breathing amplitude. */
  breath: number
  /** 0..1 hit jitter (recoil shudder). */
  jitter: number
}

/**
 * Articulated transform hierarchy driven by pose blending. Every joint is a Group; body parts
 * are attached to joints by the fighter's body builder. Pose application is allocation-free.
 */
export class CharacterRig {
  /** Positioned/rotated in the world by the fighter (position, yaw, pitch, roll). */
  readonly root = new Group()
  readonly joints: Readonly<Record<JointName, Group>>
  private readonly rest: Readonly<Record<JointName, Vector3>>
  private readonly blended = { rotations: JOINTS.map(() => new Quaternion()), hipsOffset: new Vector3() }
  private readonly tmpQ = new Quaternion()
  /** Hand shapes of the dominant pose of the current blend. */
  handL: HandShape = 'open'
  handR: HandShape = 'open'

  constructor(readonly proportions: Proportions) {
    const offsets = jointOffsets(proportions)
    const joints = {} as Record<JointName, Group>
    const rest = {} as Record<JointName, Vector3>
    for (const name of JOINTS) {
      const g = new Group()
      g.name = name
      g.position.set(...offsets[name])
      joints[name] = g
      rest[name] = g.position.clone()
    }
    for (const name of JOINTS) {
      const parent = PARENT[name]
      ;(parent ? joints[parent] : this.root).add(joints[name])
    }
    this.joints = joints
    this.rest = rest
  }

  /** Apply the blend of two poses plus procedural layers. */
  apply(from: CompiledPose, to: CompiledPose, t: number, layers: ProceduralLayers): void {
    blendPoses(from, to, t, this.blended)
    // Hands switch shape at the middle of a transition (a fist closes as the strike travels).
    const dominant = t >= 0.5 ? to : from
    this.handL = dominant.handL
    this.handR = dominant.handR
    for (let i = 0; i < JOINTS.length; i++) this.joints[JOINTS[i]].quaternion.copy(this.blended.rotations[i])
    const hips = this.joints.hips
    hips.position.copy(this.rest.hips).add(this.blended.hipsOffset)

    // Planted feet (two-bone IK), blended against FK by how much each pose plants the foot.
    this.solveLeg('L', from.footL, to.footL, t)
    this.solveLeg('R', from.footR, to.footR, t)

    // Breathing: chest rises, shoulders follow — a living silhouette even when still.
    if (layers.breath > 0) {
      const b = Math.sin(layers.time * 2.1) * layers.breath
      this.rotateLocal('chest', -0.035 * b, 0, 0)
      this.rotateLocal('neck', 0.02 * b, 0, 0)
      hips.position.y += 0.008 * b
    }
    // Hit shudder: high-frequency deterministic jitter on spine/head.
    if (layers.jitter > 0) {
      const j = layers.jitter
      const t2 = layers.time * 61
      this.rotateLocal('spine', Math.sin(t2) * 0.08 * j, Math.sin(t2 * 1.3) * 0.06 * j, 0)
      this.rotateLocal('head', Math.sin(t2 * 0.9 + 1) * 0.12 * j, 0, Math.sin(t2 * 1.7) * 0.08 * j)
    }
  }

  /**
   * Two-bone leg IK in character space. The hip joint position comes from the (already posed)
   * hips; the knee bends toward the pelvis' forward; the foot is kept level with the floor,
   * pitched by its FK rotation. Weight = how much the from/to poses plant this foot.
   */
  private solveLeg(side: 'L' | 'R', a: Vector3 | null, b: Vector3 | null, t: number): void {
    const wa = a ? 1 - t : 0
    const wb = b ? t : 0
    const weight = wa + wb
    if (weight <= 1e-4) return
    const target = this.ik.target
    if (a && b) target.lerpVectors(a, b, t)
    else target.copy((a ?? b)!)
    const thigh = this.joints[`thigh${side}`]
    const shin = this.joints[`shin${side}`]
    const foot = this.joints[`foot${side}`]
    const hips = this.joints.hips
    const { hipQ, hipInv, h, d, w, knee, x, y, z, m, q, footFk, shinFk, thighFk, worldQ } = this.ik
    thighFk.copy(thigh.quaternion)
    shinFk.copy(shin.quaternion)
    footFk.copy(foot.quaternion)
    // Work in the hips' local frame.
    hipQ.copy(hips.quaternion)
    hipInv.copy(hipQ).invert()
    h.copy(thigh.position)
    d.copy(target).sub(hips.position).applyQuaternion(hipInv).sub(h)
    const A = this.proportions.thigh
    const B = this.proportions.shin
    const dist = Math.min(Math.max(d.length(), Math.abs(A - B) + 1e-3), A + B - 1e-3)
    d.normalize()
    const cosA = (A * A + dist * dist - B * B) / (2 * A * dist)
    const angA = Math.acos(Math.min(1, Math.max(-1, cosA)))
    // Pole: the knee points forward (+Z of the hips), slightly outward.
    w.set(side === 'L' ? 0.12 : -0.12, 0, 1)
    w.addScaledVector(d, -w.dot(d)).normalize()
    knee.copy(d).multiplyScalar(Math.cos(angA) * A).addScaledVector(w, Math.sin(angA) * A)
    // Thigh frame: local +Y runs from the knee up to the hip; +Z faces the knee's front.
    y.copy(knee).multiplyScalar(-1 / A)
    z.copy(w).addScaledVector(y, -w.dot(y)).normalize()
    x.crossVectors(y, z)
    m.makeBasis(x, y, z)
    q.setFromRotationMatrix(m)
    const cosK = (A * A + B * B - dist * dist) / (2 * A * B)
    const bend = Math.PI - Math.acos(Math.min(1, Math.max(-1, cosK)))
    // Foot: level in character space, keeping the pose's pitch.
    const pitch = 2 * Math.atan2(footFk.x, footFk.w)
    // Blend IK against FK.
    thigh.quaternion.copy(thighFk).slerp(q, weight)
    shin.quaternion.copy(shinFk).slerp(this.tmpQ.setFromAxisAngle(AXIS_X, bend), weight)
    worldQ.copy(hipQ).multiply(thigh.quaternion).multiply(shin.quaternion).invert()
    this.tmpQ.setFromAxisAngle(AXIS_X, pitch).premultiply(worldQ)
    foot.quaternion.copy(footFk).slerp(this.tmpQ, weight)
  }

  private readonly ik = {
    target: new Vector3(),
    hipQ: new Quaternion(),
    hipInv: new Quaternion(),
    h: new Vector3(),
    d: new Vector3(),
    w: new Vector3(),
    knee: new Vector3(),
    x: new Vector3(),
    y: new Vector3(),
    z: new Vector3(),
    m: new Matrix4(),
    q: new Quaternion(),
    footFk: new Quaternion(),
    shinFk: new Quaternion(),
    thighFk: new Quaternion(),
    worldQ: new Quaternion(),
  }

  private rotateLocal(name: JointName, x: number, y: number, z: number): void {
    this.tmpQ.setFromAxisAngle(AXIS_X, x)
    this.joints[name].quaternion.multiply(this.tmpQ)
    if (y !== 0) this.joints[name].quaternion.multiply(this.tmpQ.setFromAxisAngle(AXIS_Y, y))
    if (z !== 0) this.joints[name].quaternion.multiply(this.tmpQ.setFromAxisAngle(AXIS_Z, z))
  }

  /** World position of a joint (call after the root's matrixWorld is current). */
  jointWorld(name: JointName, out: Vector3): Vector3 {
    return this.joints[name].getWorldPosition(out)
  }

  attach(name: JointName, part: Object3D): void {
    this.joints[name].add(part)
  }

  static index(name: JointName): number {
    return JOINT_INDEX[name]
  }
}

const AXIS_X = new Vector3(1, 0, 0)
const AXIS_Y = new Vector3(0, 1, 0)
const AXIS_Z = new Vector3(0, 0, 1)
