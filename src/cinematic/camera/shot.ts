import type { SegmentContext } from '../engine/CinematicTimeline'
import { CUES } from '../engine/cues'
import { SHOTS, type ShotName, type ShotPreset } from './cameraPresets'

export interface ShotOptions {
  /** Transition duration in seconds. 0 = hard cut. */
  duration?: number
  ease?: string
}

/**
 * Schedules a camera shot on the master timeline. This is the ONLY way sequences move the
 * camera, which keeps all camera choreography timeline-driven and seekable.
 */
export function shot(ctx: SegmentContext, name: ShotName | ShotPreset, local: number, options: ShotOptions = {}): void {
  const base: ShotPreset = typeof name === 'string' ? SHOTS[name] : name
  const preset: ShotPreset = ctx.layout === 'portrait' && base.portrait ? { fit: 0, ...base, ...base.portrait } : base
  const { duration = 0, ease = 'power2.inOut' } = options
  const cam = ctx.state.camera
  const t = ctx.at(local)
  const [px, py, pz] = preset.position
  const [tx, ty, tz] = preset.target
  const scalars = {
    fov: preset.fov,
    roll: preset.roll ?? 0,
    trackWeight: preset.trackWeight ?? 0,
    lag: preset.lag,
    breathe: ctx.motion.reduced ? preset.breathe * 0.4 : preset.breathe,
    fit: preset.fit ?? 1,
    lead: preset.lead ?? 0,
  }

  ctx.tl.set(cam, { mode: preset.mode, track: preset.track ?? 'origin' }, t)

  if (duration <= 0) {
    ctx.tl.set(cam.position, { x: px, y: py, z: pz }, t)
    ctx.tl.set(cam.target, { x: tx, y: ty, z: tz }, t)
    ctx.tl.set(cam, scalars, t)
    ctx.cue(CUES.CAMERA_CUT, local)
    return
  }

  ctx.tl.to(cam.position, { x: px, y: py, z: pz, duration, ease }, t)
  ctx.tl.to(cam.target, { x: tx, y: ty, z: tz, duration, ease }, t)
  ctx.tl.to(cam, { ...scalars, duration, ease }, t)
}

/** Schedules a shake impulse (scaled by the motion profile; removed entirely for reduced motion). */
export function shake(ctx: SegmentContext, local: number, amount: number): void {
  const scaled = amount * ctx.motion.shake
  if (scaled > 0) ctx.cue(CUES.CAMERA_SHAKE, local, { amount: scaled })
}
