import { shot } from '../../camera/shot'
import { BURST, CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { MARKS } from './marks'
import { burst, flash, moveTo, pose, set, shakeIf, speedLines, tween } from './moves'

/**
 * Yaw that turns AERON's LEFT side (where the hook kick extends) toward NOX's head, plus a full
 * turn: the kick spins through. Character +X maps to world (cos θ, 0, -sin θ).
 */
const KICK_YAW = Math.atan2(-(MARKS.noxLunge.z - MARKS.kickFrom.z), MARKS.noxLunge.x - MARKS.kickFrom.x) + Math.PI * 2
/** Yaw from the spin-out mark back to NOX. */
const FACE_NOX = Math.atan2(MARKS.noxHome.x - MARKS.kickFrom.x, MARKS.noxHome.z - MARKS.kickFrom.z)

/**
 * SCENE 04 — CLOSE COMBAT (1.9 s). Four moves, each with cause → reaction:
 *  1. AERON body kick → NOX low block (contact, sparks, hit-stop).
 *  2. NOX grab → AERON pivots out of it.
 *  3. AERON spinning hook kick → NOX phases; the shin passes through his echo.
 *  4. Both reset.
 */
export const closeCombatSegment: PhaseSegment = {
  phase: 'ENGAGE',
  duration: 1.9,
  build(ctx) {
    const R = ctx.motion.reduced
    ctx.scene('close-combat', 'Close combat', 0)
    shot(ctx, 'CLOSE_TWO', 0)

    // 1. Body kick → low block.
    pose(ctx, 'velocity', 'lowGuard', 0.0, 0.1, 'power2.out')
    pose(ctx, 'velocity', 'bodyKick', 0.12, 0.12, 'back.out(1.2)')
    pose(ctx, 'void', 'blockLow', 0.1, 0.09, 'power3.out')
    ctx.cue(CUES.CLASH, 0.24)
    burst(ctx, BURST.SPARKS, { x: MARKS.noxHome.x - 0.2, y: 0.88, z: 0.05 }, 0.24, 0.8)
    flash(ctx, 0.24, 0.12, 0.08)
    shakeIf(ctx, 0.24, 0.25)
    tween(ctx, 'void', { hit: 0.6 }, 0.24, 0.02)
    tween(ctx, 'void', { hit: 0 }, 0.3, 0.25)
    pose(ctx, 'velocity', 'guard', 0.42, 0.14, 'power2.out')

    // 2. NOX grabs; AERON pivots out.
    shot(ctx, 'GRAB_OTS', 0.58)
    pose(ctx, 'void', 'grab', 0.6, 0.1, 'power3.out')
    moveTo(ctx, 'void', MARKS.noxLunge, 0.6, 0.14, 'power2.out')
    ctx.cue(CUES.VOID_GRAB, 0.68)
    pose(ctx, 'velocity', 'rotateOut', 0.64, 0.1, 'power3.out')
    moveTo(ctx, 'velocity', MARKS.rotateOut, 0.64, 0.16, 'power2.out')
    pose(ctx, 'void', 'grabMiss', 0.76, 0.1, 'power2.out')

    // 3. Spinning hook kick → NOX phases.
    shot(ctx, 'SPIN_LOW', 0.92)
    pose(ctx, 'velocity', 'spinKick', 0.94, 0.16, 'power2.out')
    moveTo(ctx, 'velocity', MARKS.kickFrom, 0.92, 0.2, 'power2.out')
    if (R) tween(ctx, 'velocity', { yaw: KICK_YAW - Math.PI * 2 }, 0.92, 0.3, 'power2.inOut')
    else {
      tween(ctx, 'velocity', { yaw: KICK_YAW }, 0.92, 0.26, 'power2.out')
      speedLines(ctx, 0.95, 0.2, Math.PI * 0.2, 0.5)
    }
    pose(ctx, 'void', 'phaseLean', 1.02, 0.08, 'power3.out')
    tween(ctx, 'void', { phase: 1 }, 1.06, 0.03, 'expo.out')
    ctx.cue(CUES.VOID_PHASE, 1.1)
    burst(ctx, BURST.VOID, { x: MARKS.noxLunge.x, y: 1.5, z: 0 }, 1.1, 0.5)
    tween(ctx, 'void', { phase: 0 }, 1.3, 0.15, 'power2.in')
    moveTo(ctx, 'void', MARKS.noxHome, 1.3, 0.3, 'power2.inOut')
    pose(ctx, 'void', 'guard', 1.35, 0.25, 'power2.inOut')

    // 4. Reset: AERON comes round to face NOX again.
    pose(ctx, 'velocity', 'guard', 1.32, 0.2, 'power2.out')
    tween(ctx, 'velocity', { yaw: (R ? FACE_NOX : FACE_NOX + Math.PI * 2) }, 1.3, 0.3, 'power2.inOut')
    set(ctx, 'velocity', { yaw: FACE_NOX }, 1.62)
    tween(ctx, 'velocity', { energy: 0.55 }, 1.4, 0.3)
  },
}
