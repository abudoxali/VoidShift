import { shot } from '../../camera/shot'
import { BURST, CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { MARKS } from './marks'
import { burst, pose, set, tween } from './moves'

/**
 * SCENE 01 — ARRIVAL (2.0 s). Near black. NOX is already there: a silhouette and two violet
 * eyes. AERON reconstructs from cyan code (energy skeleton → fragments → body), rises; the
 * scarf settles. Low wide: two fighters, one space.
 */
export const arrivalSegment: PhaseSegment = {
  phase: 'BOOT',
  duration: 2.0,
  build(ctx) {
    const { tl, state, at } = ctx
    ctx.scene('arrival', 'Arrival', 0)
    shot(ctx, 'ARRIVAL_WIDE', 0)
    tl.to(state.fx, { gate: 1, duration: 0.45, ease: 'expo.out' }, at(0))

    // NOX: already standing in the dark. Only a violet rim and his eyes.
    set(ctx, 'void', { reveal: 1, energy: 0.8 }, 0)
    tl.to(state.lights, { rimVoid: 1.1, duration: 0.5 }, at(0))
    ctx.cue(CUES.VOID_OPEN, 0.05)

    // The world barely there: floor near AERON, distant monoliths as shapes.
    tl.to(state.world, { atmosphere: 0.4, structures: 0.45, reveal: 7, duration: 1.4, ease: 'power1.out' }, at(0.2))

    // AERON reconstructs.
    ctx.cue(CUES.VELOCITY_ASSEMBLE, 0.25)
    burst(ctx, BURST.ASSEMBLE, { x: MARKS.aeronHome.x, y: 0.85, z: 0 }, 0.25, 0.9)
    tween(ctx, 'velocity', { reveal: 1, energy: 0.9 }, 0.25, 1.05, 'power1.inOut')
    pose(ctx, 'velocity', 'stand', 1.2, 0.45, 'power2.out')
    burst(ctx, BURST.DUST, { x: MARKS.aeronHome.x, y: 0.05, z: 0 }, 1.25, 0.6)
    tween(ctx, 'velocity', { energy: 0.45 }, 1.4, 0.5)
    tl.to(state.lights, { rimVelocity: 1, key: 0.5, ambient: 0.2, duration: 0.7 }, at(1.0))
  },
}
