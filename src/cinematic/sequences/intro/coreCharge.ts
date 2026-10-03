import { shot } from '../../camera/shot'
import { CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { MARKS } from './marks'
import { moveTo, pose, tween } from './moves'

/**
 * BEAT 08 — CODE CORE (2.8 s). The held hero frame: VELOCITY, inverted above VOID's back, forms
 * the Code Core in its striking hand — glyph rings, arcs, spiral light — and the whole stage is
 * lit by it. Insert on the core; insert on VOID looking up, reaching, failing to phase. Then a
 * three-frame cock of the arm, and the slam.
 */
export const coreChargeSegment: PhaseSegment = {
  phase: 'CORE_CHARGE',
  duration: 2.8,
  build(ctx) {
    const { tl, state, at, motion } = ctx
    const c = state.core
    shot(ctx, 'HERO_LOW_PUSH', 0.02, { duration: 0.98, ease: 'sine.inOut' })
    ctx.cue(CUES.CORE_FORM, 0)
    // Forms fast (it is answering a decision already made), then keeps feeding.
    tl.to(c, { charge: 0.55, duration: 0.45, ease: 'power2.out' }, at(0))
    tl.to(c, { charge: 1, duration: 1.25, ease: 'power1.in' }, at(0.45))
    tl.to(state.lights, { key: 0.25, ambient: 0.25, duration: 1.2 }, at(0.1))
    tween(ctx, 'velocity', { energy: 1 }, 0, 0.5)
    // Held, but alive: a slow drift of the whole hero frame.
    moveTo(ctx, 'velocity', { x: MARKS.above.x - 0.05, y: MARKS.above.y - 0.08, z: MARKS.above.z }, 0, 2.3, 'sine.inOut')

    shot(ctx, 'CORE_CLOSE', 1.0)
    shot(ctx, 'VOID_FACE', 1.6)
    pose(ctx, 'void', 'reach', 1.5, 0.3, 'back.out(1.3)')
    ctx.cue(CUES.VOID_PHASE_FAIL, 1.75)
    tween(ctx, 'void', { phase: 0.6, hit: 0.4 }, 1.75, 0.05)
    tween(ctx, 'void', { phase: 0, hit: 0 }, 1.82, 0.3, 'power2.in')
    tl.to(state.fx, { lens: 0.8, duration: 0.05 }, at(1.75))
    tl.to(state.fx, { lens: 0.35, duration: 0.3 }, at(1.82))

    shot(ctx, 'HERO_LOW', 2.2)
    // Anticipation (3 frames) → slam.
    pose(ctx, 'velocity', 'coreCock', 2.45, 0.1, 'power2.out')
    tl.to(c, { overload: 1, duration: 0.3, ease: 'power2.in' }, at(2.45))
    pose(ctx, 'velocity', 'strike', 2.66, 0.06, 'expo.out')
    moveTo(ctx, 'velocity', MARKS.slam, 2.66, 0.14, motion.reduced ? 'sine.inOut' : 'expo.in')
  },
}
