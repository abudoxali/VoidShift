/**
 * Humanoid skeleton shared by both fighters. Joint-local frame: +Y up, +Z forward (the way the
 * character faces), +X = the character's left. Limbs hang along -Y in the rest pose.
 */
export const JOINTS = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'shoulderL',
  'upperArmL',
  'foreArmL',
  'handL',
  'shoulderR',
  'upperArmR',
  'foreArmR',
  'handR',
  'thighL',
  'shinL',
  'footL',
  'thighR',
  'shinR',
  'footR',
] as const

export type JointName = (typeof JOINTS)[number]

export const JOINT_INDEX: Readonly<Record<JointName, number>> = Object.fromEntries(JOINTS.map((j, i) => [j, i])) as Record<JointName, number>

export const PARENT: Readonly<Record<JointName, JointName | null>> = {
  hips: null,
  spine: 'hips',
  chest: 'spine',
  neck: 'chest',
  head: 'neck',
  shoulderL: 'chest',
  upperArmL: 'shoulderL',
  foreArmL: 'upperArmL',
  handL: 'foreArmL',
  shoulderR: 'chest',
  upperArmR: 'shoulderR',
  foreArmR: 'upperArmR',
  handR: 'foreArmR',
  thighL: 'hips',
  shinL: 'thighL',
  footL: 'shinL',
  thighR: 'hips',
  shinR: 'thighR',
  footR: 'shinR',
}

/** Body proportions; each fighter scales these to get its own silhouette. */
export interface Proportions {
  hipHeight: number
  spine: number
  chest: number
  neck: number
  head: number
  shoulderWidth: number
  upperArm: number
  foreArm: number
  hand: number
  hipWidth: number
  thigh: number
  shin: number
}

export type Vec3 = [number, number, number]

/** Rest-pose offset of every joint from its parent. */
export function jointOffsets(p: Proportions): Record<JointName, Vec3> {
  const sw = p.shoulderWidth / 2
  const hw = p.hipWidth / 2
  return {
    hips: [0, p.hipHeight, 0],
    spine: [0, p.spine, 0],
    chest: [0, p.chest, 0],
    neck: [0, p.neck, 0],
    head: [0, p.head * 0.35, 0],
    shoulderL: [sw * 0.55, p.neck * 0.7, 0],
    upperArmL: [sw * 0.45, 0, 0],
    foreArmL: [0, -p.upperArm, 0],
    handL: [0, -p.foreArm, 0],
    shoulderR: [-sw * 0.55, p.neck * 0.7, 0],
    upperArmR: [-sw * 0.45, 0, 0],
    foreArmR: [0, -p.upperArm, 0],
    handR: [0, -p.foreArm, 0],
    thighL: [hw, -0.04, 0],
    shinL: [0, -p.thigh, 0],
    footL: [0, -p.shin, 0],
    thighR: [-hw, -0.04, 0],
    shinR: [0, -p.thigh, 0],
    footR: [0, -p.shin, 0],
  }
}
