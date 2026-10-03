import { shot } from '../../camera/shot'
import { CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'

/**
 * BOOT — nothing exists except one coordinate. It blinks twice (a cursor finding its
 * position), the cinematic gate opens and the two axes of the world are drawn out of it.
 */
export const bootSegment: PhaseSegment = {
  phase: 'BOOT',
  duration: (motion) => (motion.reduced ? 1.7 : 2.2),
  build(ctx) {
    const { tl, state, at } = ctx
    const w = state.world
    shot(ctx, 'BOOT_ORIGIN', 0)

    if (ctx.motion.reduced) {
      tl.to(w, { origin: 1, duration: 0.4, ease: 'power1.out' }, at(0.2))
    } else {
      tl.to(w, { origin: 1, duration: 0.04 }, at(0.25))
      tl.to(w, { origin: 0.12, duration: 0.08 }, at(0.47))
      tl.to(w, { origin: 1, duration: 0.04 }, at(0.72))
      ctx.cue(CUES.BOOT_PULSE, 0.25)
      ctx.cue(CUES.BOOT_PULSE, 0.72)
    }

    const open = ctx.motion.reduced ? 0.55 : 0.95
    tl.to(state.fx, { gate: 1, duration: 1.1, ease: 'expo.inOut' }, at(open))
    tl.to(w, { axis: 1, duration: 0.9, ease: 'expo.out' }, at(open + 0.05))
    tl.to(w, { atmosphere: 0.35, duration: 0.9, ease: 'power1.inOut' }, at(open + 0.3))
  },
}
