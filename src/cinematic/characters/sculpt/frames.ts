import { Matrix4, Quaternion, Vector3 } from 'three'
import { CharacterRig } from '../../animation/CharacterRig'
import { armL, armR, compilePose, legL, legR, type CompiledPose } from '../../animation/pose'
import { JOINTS, JOINT_INDEX, type JointName, type Proportions } from '../../animation/skeleton'
import { rotation, type V3 } from './sdf'

/**
 * Bind pose of every fighter mesh: a relaxed A-pose (arms ~40° from the body, elbows soft, feet
 * slightly apart). Sculpting in an A-pose keeps the armpits and inner thighs open, so smooth
 * unions never fuse limbs to the torso, and skin weights stay clean.
 */
export const BIND_POSE: CompiledPose = compilePose({
  joints: { ...armL(6, 40, 10), ...armR(6, 40, 10), ...legL(0, 3, 0), ...legR(0, 3, 0) },
})

const IDENTITY_LAYERS = { time: 0, breath: 0, jitter: 0 }

/** Poses a rig at the bind pose (root at the origin of character space). */
export function applyBindPose(rig: CharacterRig): void {
  rig.apply(BIND_POSE, BIND_POSE, 1, IDENTITY_LAYERS)
}

/**
 * Bind-pose joint frames in character space (feet on y = 0, facing +Z, +X = character's left).
 * Designs author features in a joint's local frame (`at`, `rot`) so limbs keep their shape at any
 * bind angle.
 */
export class Frames {
  readonly bone: Readonly<Record<JointName, number>> = JOINT_INDEX
  private readonly world: Matrix4[]
  private readonly q: Quaternion[]

  constructor(readonly proportions: Proportions) {
    const rig = new CharacterRig(proportions)
    applyBindPose(rig)
    rig.root.updateMatrixWorld(true)
    this.world = JOINTS.map((j) => rig.joints[j].matrixWorld.clone())
    this.q = JOINTS.map((j) => rig.joints[j].getWorldQuaternion(new Quaternion()))
  }

  /** Joint origin. */
  pos(j: JointName): V3 {
    const e = this.world[JOINT_INDEX[j]].elements
    return [e[12], e[13], e[14]]
  }

  /** A point given in the joint's local frame. */
  at(j: JointName, local: V3): V3 {
    const v = new Vector3(...local).applyMatrix4(this.world[JOINT_INDEX[j]])
    return [v.x, v.y, v.z]
  }

  /** A direction given in the joint's local frame. */
  dir(j: JointName, local: V3): V3 {
    const v = new Vector3(...local).applyQuaternion(this.q[JOINT_INDEX[j]])
    return [v.x, v.y, v.z]
  }

  /**
   * World→local rotation (row-major) of the joint frame, optionally followed by an extra local
   * Euler rotation (radians) — for ellipsoids and boxes that follow a bone.
   */
  rot(j: JointName, extra: V3 = [0, 0, 0]): number[] {
    const m = new Matrix4().makeRotationFromQuaternion(this.q[JOINT_INDEX[j]])
    const ex = rotation(extra[0], extra[1], extra[2])
    // world→local = extra^T(local) ∘ R^T
    const r = m.elements // column-major local→world
    const Rt = [r[0], r[1], r[2], r[4], r[5], r[6], r[8], r[9], r[10]] // rows of R^T
    const out = new Array<number>(9)
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 3; k++) out[i * 3 + k] = ex[i * 3] * Rt[k] + ex[i * 3 + 1] * Rt[3 + k] + ex[i * 3 + 2] * Rt[6 + k]
    return out
  }
}
