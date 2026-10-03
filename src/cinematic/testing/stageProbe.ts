import { Group, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { CharacterRig } from '../animation/CharacterRig'
import { AERON_POSES } from '../animation/poses/aeronPoses'
import { NOX_POSES } from '../animation/poses/noxPoses'
import type { JointName } from '../animation/skeleton'
import { CameraRig } from '../camera/CameraRig'
import { SHOTS, type ShotPreset } from '../camera/cameraPresets'
import { AERON_PROPORTIONS } from '../characters/Aeron/buildAeronBody'
import { NOX_PROPORTIONS } from '../characters/Nox/buildNoxBody'
import { PIVOT_HEIGHT, driveFighter, type FighterRig } from '../characters/useFighterRig'
import type { CinematicEngine } from '../engine/CinematicEngine'

/**
 * Test / tooling helper: poses both fighters from the engine state exactly as the scene does, and
 * projects their extremities through the shot camera. Used by the framing and contact tests.
 */
export type FighterId = 'velocity' | 'void'

export interface Stage {
  rigs: Record<FighterId, FighterRig>
  camera: PerspectiveCamera
  rig: CameraRig
}

function fighterRig(proportions: typeof AERON_PROPORTIONS): FighterRig {
  const rig = new CharacterRig(proportions)
  const outer = new Group()
  rig.root.position.y = -PIVOT_HEIGHT
  outer.add(rig.root)
  return { outer, rig }
}

export function createStage(): Stage {
  return { rigs: { velocity: fighterRig(AERON_PROPORTIONS), void: fighterRig(NOX_PROPORTIONS) }, camera: new PerspectiveCamera(35, 16 / 9, 0.05, 400), rig: new CameraRig() }
}

/** Pose both rigs and place the camera for the engine's current time. */
export function sampleStage(stage: Stage, engine: CinematicEngine, aspect = 16 / 9): void {
  const s = engine.state
  driveFighter(s.fighters.velocity, stage.rigs.velocity, AERON_POSES, AERON_POSES.guard, engine)
  driveFighter(s.fighters.void, stage.rigs.void, NOX_POSES, NOX_POSES.guard, engine)
  stage.rig.snap()
  stage.rig.update(s.camera, (id) => (id === 'velocity' || id === 'void' ? s.fighters[id].position : s.camera.target), aspect, engine.elapsed, 0)
  stage.camera.aspect = aspect
  stage.rig.apply(stage.camera)
  stage.camera.updateProjectionMatrix()
  stage.camera.updateMatrixWorld(true)
}

const q = new Quaternion()
/** World position of a joint, or of a point in that joint's frame. */
export function jointPoint(stage: Stage, id: FighterId, joint: JointName, local?: [number, number, number]): Vector3 {
  const rig = stage.rigs[id].rig
  const p = rig.jointWorld(joint, new Vector3())
  if (local) p.add(new Vector3(...local).applyQuaternion(rig.joints[joint].getWorldQuaternion(q)))
  return p
}

/** Extremities that must be in frame for a full-body read. */
export function extremities(stage: Stage, id: FighterId): Record<string, Vector3> {
  const H = stage.rigs[id].rig.proportions.head
  return {
    headTop: jointPoint(stage, id, 'head', [0, H * 1.05, 0]),
    handL: jointPoint(stage, id, 'handL', [0, -0.12, 0]),
    handR: jointPoint(stage, id, 'handR', [0, -0.12, 0]),
    footL: jointPoint(stage, id, 'footL', [0, -0.05, 0.12]),
    footR: jointPoint(stage, id, 'footR', [0, -0.05, 0.12]),
  }
}

/** Letterbox: the visible NDC half-height on a 16:9 screen (cinematic gate 2.2:1). */
export const VISIBLE_Y = 1 - 2 * ((1 - (16 / 9) / 2.2) / 2)

export function ndc(stage: Stage, p: Vector3): Vector3 {
  return p.clone().project(stage.camera)
}

export function inFrame(stage: Stage, p: Vector3, margin = 0.02): boolean {
  const n = ndc(stage, p)
  return n.z < 1 && Math.abs(n.x) <= 1 - margin && Math.abs(n.y) <= VISIBLE_Y - margin
}

export function shotPreset(name: string | null | undefined): ShotPreset | null {
  return name && name in SHOTS ? (SHOTS as Record<string, ShotPreset>)[name] : null
}
