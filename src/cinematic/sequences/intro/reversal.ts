import { shot } from '../../camera/shot'
import { CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { MARKS } from './marks'
import { arc, moveTo, pose, tween } from './moves'

/**
 * SCENE 09 — POSITIONAL REVERSAL (1.1 s). NOX reacts — head first, then shoulders, then torso —
 * and it is too late: AERON is already above and behind him.
 */
export const reversalSegment: PhaseSegment = {
  phase: 'LOCK',
  duration: 1.1,
  build(ctx) {
    const { motion } = ctx
    ctx.scene('reversal', 'Reversal', 0)
    shot(ctx, 'NOX_TURN', 0)
    tween(ctx, 'void', { phase: 0 }, 0.0, 0.15)
    pose(ctx, 'void', 'turnHead', 0.02, 0.14, 'power3.out')
    ctx.cue(CUES.VOID_REALIZE, 0.04)
    pose(ctx, 'void', 'turnShoulders', 0.3, 0.16, 'power2.out')
    pose(ctx, 'void', 'turnGuard', 0.56, 0.22, 'power2.out')

    // AERON: from the anchor up and over to above NOX's back, the core hand coming forward.
    if (motion.reduced) moveTo(ctx, 'velocity', MARKS.above, 0.1, 0.7, 'sine.inOut')
    else arc(ctx, 'velocity', MARKS.above, MARKS.above.y + 0.35, 0.1, 0.7)
    tween(ctx, 'velocity', { pitch: 0.42 }, 0.15, 0.5, 'power2.inOut')
    pose(ctx, 'velocity', 'coreHold', 0.35, 0.35, 'power2.inOut')
    shot(ctx, 'REVERSAL_WIDE', 0.6)
  },
}
