import { Euler, MathUtils, Quaternion, Vector3 } from 'three'
import { JOINTS, JOINT_INDEX, type JointName, type Vec3 } from './skeleton'

/**
 * Authored pose: joint rotations in DEGREES relative to the rest pose (Euler XYZ), plus a hips
 * offset/rotation. Conventions (joint-local, character faces +Z):
 *  - spine/chest/neck/head  x > 0 bends forward, y twists toward the character's left, z leans left
 *  - upperArm               x < 0 swings the arm forward/up; z > 0 raises sideways (left arm),
 *                           use mirrored helpers for the right arm
 *  - foreArm                x < 0 bends the elbow forward
 *  - thigh                  x < 0 lifts the knee forward
 *  - shin                   x > 0 bends the knee
 */
export type HandShape = 'open' | 'fist' | 'blade'

export interface PoseSpec {
  /** Hips offset from rest (world units): y crouch (<0), z shift forward. */
  hips?: { x?: number; y?: number; z?: number; rot?: Vec3 }
  joints: Partial<Record<JointName, Vec3>>
  /** Hand shapes held in this pose (default: open). */
  hands?: { L?: HandShape; R?: HandShape }
  /**
   * Planted feet: ankle targets in character space (x left, y up from the floor, z forward).
   * The rig solves the leg with two-bone IK (knee toward the front) and keeps the foot level,
   * using the pose's foot rotation as pitch. Omit for airborne poses (pure FK).
   */
  feet?: { L?: Vec3; R?: Vec3 }
}

export interface CompiledPose {
  readonly rotations: readonly Quaternion[]
  readonly hipsOffset: Vector3
  readonly handL: HandShape
  readonly handR: HandShape
  readonly footL: Vector3 | null
  readonly footR: Vector3 | null
}

const euler = new Euler()

export function compilePose(spec: PoseSpec): CompiledPose {
  const rotations = JOINTS.map(() => new Quaternion())
  for (const [name, deg] of Object.entries(spec.joints) as [JointName, Vec3][]) {
    euler.set(MathUtils.degToRad(deg[0]), MathUtils.degToRad(deg[1]), MathUtils.degToRad(deg[2]), 'XYZ')
    rotations[JOINT_INDEX[name]].setFromEuler(euler)
  }
  const h = spec.hips ?? {}
  if (h.rot) {
    euler.set(MathUtils.degToRad(h.rot[0]), MathUtils.degToRad(h.rot[1]), MathUtils.degToRad(h.rot[2]), 'XYZ')
    rotations[JOINT_INDEX.hips].setFromEuler(euler)
  }
  return { rotations, hipsOffset: new Vector3(h.x ?? 0, h.y ?? 0, h.z ?? 0), handL: spec.hands?.L ?? 'open', handR: spec.hands?.R ?? 'open', footL: spec.feet?.L ? new Vector3(...spec.feet.L) : null, footR: spec.feet?.R ? new Vector3(...spec.feet.R) : null }
}

/** Writes the blend of two compiled poses into `out` (allocation-free). */
export function blendPoses(a: CompiledPose, b: CompiledPose, t: number, out: { rotations: Quaternion[]; hipsOffset: Vector3 }): void {
  for (let i = 0; i < JOINTS.length; i++) out.rotations[i].slerpQuaternions(a.rotations[i], b.rotations[i], t)
  out.hipsOffset.lerpVectors(a.hipsOffset, b.hipsOffset, t)
}

// ── Authoring helpers (mirroring) ─────────────────────────────────────────────

/** Arm: forward swing (deg, + = forward/up), outward raise (deg), elbow bend (deg, + = bent). */
export function armL(forward: number, out: number, elbow: number, twist = 0): Partial<Record<JointName, Vec3>> {
  return { upperArmL: [-forward, twist, out], foreArmL: [-elbow, 0, 0] }
}
export function armR(forward: number, out: number, elbow: number, twist = 0): Partial<Record<JointName, Vec3>> {
  return { upperArmR: [-forward, -twist, -out], foreArmR: [-elbow, 0, 0] }
}
/** Leg: knee lift (deg, + = thigh forward), spread (deg), knee bend (deg), foot pitch. */
export function legL(lift: number, spread: number, knee: number, foot = 0): Partial<Record<JointName, Vec3>> {
  return { thighL: [-lift, 0, spread], shinL: [knee, 0, 0], footL: [foot, 0, 0] }
}
export function legR(lift: number, spread: number, knee: number, foot = 0): Partial<Record<JointName, Vec3>> {
  return { thighR: [-lift, 0, -spread], shinR: [knee, 0, 0], footR: [foot, 0, 0] }
}
