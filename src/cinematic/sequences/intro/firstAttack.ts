import { shot } from '../../camera/shot'
import { BURST, CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { CHEST, MARKS } from './marks'
import { burst, dash, flash, moveTo, pose, shakeIf, tween } from './moves'

/**
 * SCENE 03 — FIRST ATTACK (1.8 s).
 * AERON explodes forward: left step, body lean, right straight. NOX barely moves; the phase
 * begins only at contact. The fist passes through his upper torso — slowed at the penetration
 * only. NOX reforms and counters at once with a horizontal elbow; AERON ducks under it.
 */
export const firstAttackSegment: PhaseSegment = {
  phase: 'SPAWN',
  duration: 1.8,
  build(ctx) {
    const { tl, state, at } = ctx
    ctx.scene('first-attack', 'First attack', 0)
    shot(ctx, 'ATTACK_PROFILE', 0)

    // Explode forward: dash → lead step lands → hips turn → the right straight.
    pose(ctx, 'velocity', 'dash', 0.0, 0.07, 'expo.out')
    dash(ctx, 'velocity', MARKS.punch, 0.02, 0.26)
    tween(ctx, 'velocity', { trails: 1, energy: 0.9 }, 0.02, 0.05)
    pose(ctx, 'velocity', 'stepLead', 0.2, 0.05, 'power2.out')
    pose(ctx, 'velocity', 'cross', 0.27, 0.06, 'expo.out')

    // NOX: a minimal sway — and the phase, only at contact.
    pose(ctx, 'void', 'phaseLean', 0.26, 0.1, 'power3.out')
    tween(ctx, 'void', { phase: 1 }, 0.31, 0.03, 'expo.out')
    ctx.cue(CUES.VOID_PHASE, 0.33)
    burst(ctx, BURST.VOID, { x: MARKS.noxHome.x, y: CHEST, z: 0 }, 0.33, 0.6)
    flash(ctx, 0.33, 0.1, 0.1)
    tl.to(state.fx, { lens: 0.8, duration: 0.05 }, at(0.33))

    // Penetration, slowed: the fist travels through his chest; AERON over-extends.
    shot(ctx, 'PENETRATION', 0.33)
    pose(ctx, 'velocity', 'overextend', 0.34, 0.42, 'sine.inOut')
    moveTo(ctx, 'velocity', { x: MARKS.punch.x + 0.12, y: 0, z: 0 }, 0.34, 0.42, 'sine.inOut')
    tween(ctx, 'velocity', { trails: 0 }, 0.34, 0.1)

    // Withdraw; NOX reforms around the empty space and counters with the elbow.
    pose(ctx, 'velocity', 'guard', 0.78, 0.12, 'power3.out')
    moveTo(ctx, 'velocity', MARKS.punch, 0.78, 0.12, 'power2.out')
    tween(ctx, 'void', { phase: 0 }, 0.8, 0.1, 'power2.in')
    tl.to(state.fx, { lens: 0.25, duration: 0.2 }, at(0.82))
    shot(ctx, 'COUNTER_TWO', 0.86)
    pose(ctx, 'void', 'elbowWind', 0.86, 0.09, 'power2.out')
    pose(ctx, 'void', 'elbow', 0.97, 0.07, 'expo.out')
    ctx.cue(CUES.VOID_COUNTER, 0.99)
    pose(ctx, 'velocity', 'duck', 0.94, 0.07, 'expo.out')
    moveTo(ctx, 'velocity', MARKS.duck, 0.94, 0.14, 'power2.out')
    shakeIf(ctx, 0.99, 0.15)

    // Reset to guard: the next exchange is coming.
    pose(ctx, 'void', 'guard', 1.18, 0.25, 'power2.inOut')
    pose(ctx, 'velocity', 'guard', 1.22, 0.25, 'power2.out')
    tween(ctx, 'velocity', { energy: 0.6 }, 1.2, 0.3)
  },
}
