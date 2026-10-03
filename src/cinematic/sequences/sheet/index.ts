import { shot } from '../../camera/shot'
import type { ShotPreset } from '../../camera/cameraPresets'
import { AERON_POSE_SPECS } from '../../animation/poses/aeronPoses'
import { NOX_POSE_SPECS } from '../../animation/poses/noxPoses'
import { resetCinematicState, type CinematicState } from '../../engine/CinematicState'
import type { PhaseSegment, SequenceDefinition } from '../../engine/CinematicTimeline'
import { pose } from '../intro/moves'

/**
 * Character sheet (?review=1&sheet=characters): both fighters under neutral stage light —
 * full figures, head close-ups, a turntable, and every pose of both libraries in turn.
 * A review tool for character identity, anatomy and posing, independent of the fight.
 */
const AERON_X = -0.75
const NOX_X = 0.75
const STEP = 0.9

const frame = (position: [number, number, number], target: [number, number, number], fov: number): ShotPreset => ({ mode: 'FREEZE', position, target, fov, lag: 0, breathe: 0, fit: 1, portrait: { fov: fov * 1.6 } })

function setup(state: CinematicState): void {
  resetCinematicState(state)
  Object.assign(state.world, { reveal: 60, axis: 0, atmosphere: 1, structures: 1, voidField: 0 })
  Object.assign(state.lights, { ambient: 0.6, key: 1.1, rimVelocity: 1.2, rimVoid: 1.2 })
  state.fx.gate = 1
  const v = state.fighters.velocity
  const d = state.fighters.void
  v.position.set(AERON_X, 0, 0)
  d.position.set(NOX_X, 0, 0)
  v.yaw = 0
  d.yaw = 0
  v.pose = v.from = 'stand'
  d.pose = d.from = 'stand'
  v.reveal = d.reveal = 1
  v.energy = 0.4
  d.energy = 0.3
}

const sheetSegment: PhaseSegment = {
  phase: 'REVEAL',
  duration: 16 + Math.max(Object.keys(AERON_POSE_SPECS).length, Object.keys(NOX_POSE_SPECS).length) * STEP,
  build(ctx) {
    const { tl, state, at } = ctx
    const v = state.fighters.velocity
    const d = state.fighters.void
    ctx.scene('sheet-full', 'Both fighters', 0)
    shot(ctx, frame([0, 1.0, 4.4], [0, 0.95, 0], 34), 0)
    pose(ctx, 'velocity', 'guard', 2, 0.4)
    pose(ctx, 'void', 'guard', 2, 0.4)
    ctx.scene('sheet-heads', 'Heads', 3.5)
    shot(ctx, frame([AERON_X + 0.12, 1.6, 0.85], [AERON_X, 1.58, 0], 30), 3.5)
    shot(ctx, frame([NOX_X - 0.1, 1.66, 0.9], [NOX_X, 1.64, 0], 30), 5.5)
    shot(ctx, frame([AERON_X + 0.9, 1.4, 1.1], [AERON_X, 1.55, 0], 32), 7.5)
    ctx.scene('sheet-turntable', 'Turntable', 9)
    shot(ctx, frame([0, 1.25, 4.6], [0, 0.95, 0], 32), 9)
    tl.to(v, { yaw: Math.PI * 2, duration: 6, ease: 'none' }, at(9))
    tl.to(d, { yaw: Math.PI * 2, duration: 6, ease: 'none' }, at(9))
    tl.set(v, { yaw: 0 }, at(15.01))
    tl.set(d, { yaw: 0 }, at(15.01))
    ctx.scene('sheet-poses', 'Pose gallery', 16)
    shot(ctx, frame([0.4, 1.05, 4.2], [0, 0.9, 0], 36), 16)
    tl.set(v, { yaw: 0.6 }, at(16))
    tl.set(d, { yaw: -0.6 }, at(16))
    Object.keys(AERON_POSE_SPECS).forEach((name, i) => pose(ctx, 'velocity', name, 16 + i * STEP, 0.3, 'power2.inOut'))
    Object.keys(NOX_POSE_SPECS).forEach((name, i) => pose(ctx, 'void', name, 16 + i * STEP, 0.3, 'power2.inOut'))
  },
}

export const CHARACTER_SHEET: SequenceDefinition = {
  id: 'sheet',
  initialize: setup,
  segments: [sheetSegment],
}
