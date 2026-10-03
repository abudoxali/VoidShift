import { shot } from '../../camera/shot'
import { CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { MARKS } from './marks'
import { moveTo, pose, tween } from './moves'

/**
 * SCENES 10 + 11 — CODE CORE → FINAL STRIKE (1.3 s).
 * The Core forms in AERON's hand in under a second — lighting his face, his hand, NOX below
 * and the stage. NOX tries to phase and cannot. A three-frame cock of the arm, then the drive:
 * shoulder → torso → arm → core, into NOX's upper back. Contact is the start of the IMPACT.
 */
export const coreSegment: PhaseSegment = {
  phase: 'CORE_CHARGE',
  duration: 1.3,
  build(ctx) {
    const { tl, state, at, motion } = ctx
    const c = state.core
    ctx.scene('core', 'Code Core', 0)
    shot(ctx, 'CORE_HERO', 0)
    ctx.cue(CUES.CORE_FORM, 0)
    tl.to(c, { charge: 0.7, duration: 0.3, ease: 'power2.out' }, at(0))
    tl.to(c, { charge: 1, duration: 0.45, ease: 'power1.in' }, at(0.3))
    tl.to(c, { overload: 1, duration: 0.35, ease: 'power2.in' }, at(0.75))
    tl.to(state.lights, { key: 0.3, ambient: 0.2, duration: 0.4 }, at(0.05))
    tween(ctx, 'velocity', { energy: 1 }, 0, 0.3)
    // NOX tries to phase — the field won't take him.
    ctx.cue(CUES.VOID_PHASE_FAIL, 0.45)
    tween(ctx, 'void', { phase: 0.5, hit: 0.3 }, 0.45, 0.04)
    tween(ctx, 'void', { phase: 0, hit: 0 }, 0.52, 0.2, 'power2.in')
    shot(ctx, 'CORE_LOW', 0.55)

    // Strike.
    ctx.scene('strike', 'Final strike', 0.85)
    shot(ctx, 'STRIKE_PROFILE', 0.85)
    pose(ctx, 'velocity', 'coreCock', 0.86, 0.1, 'power2.out')
    pose(ctx, 'velocity', 'coreDrive', 1.1, 0.08, 'expo.out')
    moveTo(ctx, 'velocity', MARKS.slam, 1.1, 0.2, motion.reduced ? 'sine.inOut' : 'expo.in')
    tween(ctx, 'velocity', { pitch: 0.75 }, 1.1, 0.2, 'power2.in')
  },
}
