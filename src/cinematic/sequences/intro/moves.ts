import type { Vector3 } from 'three'
import type { FighterState } from '../../engine/CinematicState'
import type { SegmentContext } from '../../engine/CinematicTimeline'
import { BURST, CUES } from '../../engine/cues'

export type FighterId = 'velocity' | 'void'
type V3 = { x: number; y: number; z: number } | Vector3

const fighter = (ctx: SegmentContext, id: FighterId): FighterState => ctx.state.fighters[id]

/**
 * Pose transition. The previous pose is remembered at BUILD time (timeline memory), so the
 * blend always goes from the authored pose that preceded it — playback stays a pure function
 * of time. `ease` carries the motion character (back.out = snap with overshoot, power2.out =
 * settle, expo.out = whip).
 */
export function pose(ctx: SegmentContext, id: FighterId, name: string, local: number, duration: number, ease = 'power2.out'): void {
  const f = fighter(ctx, id)
  const key = `pose:${id}`
  const previous = (ctx.memory.get(key) as string | undefined) ?? f.pose
  ctx.memory.set(key, name)
  ctx.tl.set(f, { from: previous, pose: name, blend: 0 }, ctx.at(local))
  ctx.tl.to(f, { blend: 1, duration: Math.max(duration, 0.001), ease }, ctx.at(local))
}

export function moveTo(ctx: SegmentContext, id: FighterId, to: V3, local: number, duration: number, ease: string): void {
  ctx.tl.to(fighter(ctx, id).position, { x: to.x, y: to.y, z: to.z, duration, ease }, ctx.at(local))
}

/** Instant placement (cuts, teleports, phase-steps). */
export function place(ctx: SegmentContext, id: FighterId, to: V3, local: number): void {
  ctx.tl.set(fighter(ctx, id).position, { x: to.x, y: to.y, z: to.z }, ctx.at(local))
}

/** Arc through the air: horizontal tween + a rise/fall pair on y. */
export function arc(ctx: SegmentContext, id: FighterId, to: V3, peak: number, local: number, duration: number): void {
  const p = fighter(ctx, id).position
  ctx.tl.to(p, { x: to.x, z: to.z, duration, ease: 'power1.inOut' }, ctx.at(local))
  ctx.tl.to(p, { y: peak, duration: duration * 0.48, ease: 'power2.out' }, ctx.at(local))
  ctx.tl.to(p, { y: to.y, duration: duration * 0.52, ease: 'power2.in' }, ctx.at(local + duration * 0.48))
}

export function set(ctx: SegmentContext, id: FighterId, values: Partial<Omit<FighterState, 'position'>>, local: number): void {
  ctx.tl.set(fighter(ctx, id), values, ctx.at(local))
}

export function tween(ctx: SegmentContext, id: FighterId, values: Partial<Omit<FighterState, 'position' | 'pose' | 'from'>>, local: number, duration: number, ease = 'power2.out'): void {
  ctx.tl.to(fighter(ctx, id), { ...values, duration, ease }, ctx.at(local))
}

export function burst(ctx: SegmentContext, kind: (typeof BURST)[keyof typeof BURST], at: V3, local: number, scale = 1): void {
  ctx.cue(CUES.BURST, local, { x: at.x, y: at.y, z: at.z, kind, scale })
}

/** A short white flash (scaled by the motion profile). */
export function flash(ctx: SegmentContext, local: number, amount: number, decay = 0.22): void {
  const a = amount * ctx.motion.flash
  if (a <= 0) return
  ctx.tl.to(ctx.state.fx, { flash: a, duration: 0.02 }, ctx.at(local))
  ctx.tl.to(ctx.state.fx, { flash: 0, duration: decay, ease: 'power2.out' }, ctx.at(local + 0.02))
}

/** 1–3 frame graphic impact frame (inverted). Removed for reduced motion. */
export function impactFrame(ctx: SegmentContext, local: number, frames = 2): void {
  if (ctx.motion.reduced) return
  ctx.tl.set(ctx.state.fx, { invert: 1 }, ctx.at(local))
  ctx.tl.set(ctx.state.fx, { invert: 0 }, ctx.at(local + frames / 30))
}

/** Directional speed lines (screen angle in radians). Removed for reduced motion. */
export function speedLines(ctx: SegmentContext, local: number, duration: number, angle: number, amount = 1): void {
  if (ctx.motion.reduced) return
  ctx.tl.set(ctx.state.fx, { speedAngle: angle }, ctx.at(local))
  ctx.tl.to(ctx.state.fx, { speed: amount, duration: 0.05 }, ctx.at(local))
  ctx.tl.to(ctx.state.fx, { speed: 0, duration: Math.max(0.08, duration * 0.4), ease: 'power2.in' }, ctx.at(local + duration * 0.6))
}

/**
 * Reduced-motion substitute for a high-speed move: dissolve, re-publish the position while
 * invisible (never registers as motion), reconstruct.
 */
export function blink(ctx: SegmentContext, id: FighterId, to: V3, local: number, fade = 0.22): void {
  const f = fighter(ctx, id)
  ctx.tl.to(f, { reveal: 0, duration: fade, ease: 'power2.in' }, ctx.at(local))
  ctx.tl.set(f.position, { x: to.x, y: to.y, z: to.z }, ctx.at(local + fade + 0.01))
  ctx.tl.to(f, { reveal: 1, duration: fade * 1.4, ease: 'power2.out' }, ctx.at(local + fade + 0.02))
}

export function shakeIf(ctx: SegmentContext, local: number, amount: number): void {
  const a = amount * ctx.motion.shake
  if (a > 0) ctx.cue(CUES.CAMERA_SHAKE, local, { amount: a })
}

/**
 * An explosive displacement: expo-in travel with directional speed lines. Under reduced motion
 * it becomes a dissolve / reconstruct (`blink`) so nothing crosses the screen at speed.
 */
export function dash(ctx: SegmentContext, id: FighterId, to: V3, local: number, duration: number, angle = 0): void {
  if (ctx.motion.reduced) {
    blink(ctx, id, to, local, Math.max(0.1, duration * 0.6))
    return
  }
  ctx.cue(CUES.VELOCITY_DASH, local)
  moveTo(ctx, id, to, local, duration, 'expo.in')
  speedLines(ctx, local, duration, angle, 0.7)
}

/** Facial expression transition (same build-time memory as `pose`). */
export function face(ctx: SegmentContext, id: FighterId, name: string, local: number, duration = 0.12): void {
  const f = fighter(ctx, id)
  const key = `face:${id}`
  const previous = (ctx.memory.get(key) as string | undefined) ?? f.expr
  ctx.memory.set(key, name)
  ctx.tl.set(f, { exprFrom: previous, expr: name, exprBlend: 0 }, ctx.at(local))
  ctx.tl.to(f, { exprBlend: 1, duration: Math.max(duration, 0.001), ease: 'power2.out' }, ctx.at(local))
}
