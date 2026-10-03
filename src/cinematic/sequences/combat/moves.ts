import type { Vector3 } from 'three'
import type { SegmentContext } from '../../engine/CinematicTimeline'

/**
 * VELOCITY movement primitives shared by the combat segments. Every move is a timeline
 * tween; nothing here keeps its own clock.
 */

export function moveTo(ctx: SegmentContext, to: Vector3, local: number, duration: number, ease: string): void {
  ctx.tl.to(ctx.state.velocity.position, { x: to.x, y: to.y, z: to.z, duration, ease }, ctx.at(local))
}

/**
 * Reduced-motion substitute for a high-speed move: the entity de-materialises, its position
 * is re-published at the destination, and it reconstructs there. Placement while invisible
 * never registers as motion (see CinematicEngine.updateDerived), so no streaks or trails fire.
 */
export function reconstructAt(ctx: SegmentContext, to: Vector3, local: number, fade = 0.3): void {
  const v = ctx.state.velocity
  ctx.tl.to(v, { reveal: 0, assemble: 0.35, duration: fade, ease: 'power2.in' }, ctx.at(local))
  ctx.tl.set(v.position, { x: to.x, y: to.y, z: to.z }, ctx.at(local + fade + 0.02))
  ctx.tl.to(v, { reveal: 1, duration: fade * 1.3, ease: 'power2.out' }, ctx.at(local + fade + 0.04))
  ctx.tl.to(v, { assemble: 1, duration: fade * 2.6, ease: 'expo.out' }, ctx.at(local + fade + 0.04))
}

/** Publishes a new attack vector: trajectory endpoints and exchange number. */
export function publishVector(ctx: SegmentContext, index: number, from: Vector3, to: Vector3, local: number): void {
  const a = ctx.state.attack
  ctx.tl.set(a, { index }, ctx.at(local))
  ctx.tl.set(a.from, { x: from.x, y: from.y, z: from.z }, ctx.at(local))
  ctx.tl.set(a.to, { x: to.x, y: to.y, z: to.z }, ctx.at(local))
}
