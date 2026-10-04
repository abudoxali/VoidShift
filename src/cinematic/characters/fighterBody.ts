import { useEffect, useMemo } from 'react'
import { Quaternion, Vector3, type Camera } from 'three'
import type { FighterState } from '../engine/CinematicState'
import type { QualityTier } from '../types'
import { FIGHTER_KITS } from './designs'
import { applyExpression, blinkAt, EXPRESSIONS, type ExpressionName } from './sculpt/expressions'
import { useCharacterGeometry } from './sculpt/loader'
import { SculptedFighter } from './sculpt/SculptedFighter'
import type { FighterRig } from './useFighterRig'

/** Mesh resolution used for a quality tier (ULTRA shares HIGH's sculpt; LITE has its own). */
export const sculptTier = (tier: QualityTier): QualityTier => (tier === 'LITE' ? 'LITE' : 'HIGH')

/** Mounts a fighter's sculpted body on its rig once the geometry is ready (null until then). */
export function useSculptedBody(id: 'aeron' | 'nox', fr: FighterRig, tier: QualityTier): SculptedFighter | null {
  const kit = FIGHTER_KITS[id]
  const geometry = useCharacterGeometry(id, sculptTier(tier))
  const body = useMemo(() => (geometry ? new SculptedFighter(kit.design, fr.rig, geometry, kit.paint) : null), [kit, fr, geometry])
  useEffect(() => {
    if (!body) return
    body.attach(fr.rig)
    return () => body.dispose()
  }, [body, fr])
  return body
}

const isExpression = (n: string): n is ExpressionName => n in EXPRESSIONS

export interface BodyDriveScratch {
  head: Vector3
  target: Vector3
  q: Quaternion
  prevHead: Vector3
  swing: Vector3
  valid: boolean
}

export const createBodyScratch = (): BodyDriveScratch => ({ head: new Vector3(), target: new Vector3(), q: new Quaternion(), prevHead: new Vector3(), swing: new Vector3(), valid: false })

/**
 * Per-frame uniforms of a sculpted body: reveal, energy, phase, hand shapes, expression (with a
 * deterministic blink), gaze toward a world target, hair swing from head motion, and the
 * camera-relative key / rim directions.
 */
export function driveBody(
  body: SculptedFighter,
  f: FighterState,
  fr: FighterRig,
  opts: { time: number; dt: number; camera: Camera; lookAt: Vector3 | null; seed: number; glow: number; rimStrength: number; rimDir: Vector3; keyDir: Vector3 },
  s: BodyDriveScratch,
): void {
  const u = body.uniforms
  u.uReveal.value = f.reveal
  u.uEnergyLevel.value = 0.45 + f.energy * 0.9
  u.uPhase.value = f.phase
  u.uTime.value = opts.time
  u.uGlowScale.value = opts.glow
  u.uRimStrength.value = opts.rimStrength
  const shape = (h: string) => (h === 'fist' ? 1 : h === 'blade' ? 2 : 0)
  u.uHand.value.set(shape(fr.rig.handL), shape(fr.rig.handR))
  applyExpression(isExpression(f.exprFrom) ? f.exprFrom : 'neutral', isExpression(f.expr) ? f.expr : 'neutral', f.exprBlend, u.uExpr.value, u.uMouth.value, blinkAt(opts.time, opts.seed))

  // Gaze: the target in head space → iris offset.
  fr.rig.jointWorld('head', s.head)
  if (opts.lookAt) {
    s.target.copy(opts.lookAt).sub(s.head).applyQuaternion(fr.rig.joints.head.getWorldQuaternion(s.q).invert()).normalize()
    u.uGaze.value.set(Math.max(-1, Math.min(1, s.target.x * 2.4)), Math.max(-1, Math.min(1, s.target.y * 2.4)))
  } else u.uGaze.value.set(0, 0)

  // Hair lags behind head motion (drag), springing back.
  if (s.valid && opts.dt > 0) {
    s.target.copy(s.head).sub(s.prevHead).divideScalar(opts.dt).applyQuaternion(fr.rig.joints.head.getWorldQuaternion(s.q).invert())
    s.target.multiplyScalar(-0.006).clampLength(0, 0.035)
    s.swing.lerp(s.target, 1 - Math.exp(-opts.dt * 10))
  } else s.swing.set(0, 0, 0)
  s.prevHead.copy(s.head)
  s.valid = f.reveal > 0.01
  u.uHairSwing.value.copy(s.swing)

  u.uKeyDir.value.copy(opts.keyDir).transformDirection(opts.camera.matrixWorldInverse)
  u.uRimDir.value.copy(opts.rimDir).transformDirection(opts.camera.matrixWorldInverse)
}
