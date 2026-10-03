import { Group, Quaternion, Vector3, type Object3D } from 'three'
import { blendPoses, type CompiledPose } from './pose'
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
    for (let i = 0; i < JOINTS.length; i++) this.joints[JOINTS[i]].quaternion.copy(this.blended.rotations[i])
    const hips = this.joints.hips
    hips.position.copy(this.rest.hips).add(this.blended.hipsOffset)

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
