import { shot } from '../../camera/shot'
import { BURST, CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { MARKS } from './marks'
import { arc, burst, flash, impactFrame, moveTo, pose, set, shakeIf, tween } from './moves'

/**
 * BEAT 09 — IMPACT → EXPLOSION → AFTERMATH (5.4 s).
 * attack → contact (impact frame, hit-stop) → expansion (shockwave, rays, debris of geometry
 * and code, crater, light burst, camera trauma) → decay (light falls off, debris arcs, some of it
 * pulled back into VOID) → aftermath (haze, VELOCITY landed, VOID down, the world still humming).
 */
export const impactSegment: PhaseSegment = {
  phase: 'IMPACT',
  duration: 5.4,
  build(ctx) {
    const { tl, state, at, motion } = ctx
    const i = state.impact
    const c = MARKS.contact

    // Contact.
    shot(ctx, 'IMPACT_HERO', 0)
    tl.set(i.position, { x: c.x, y: c.y, z: c.z }, at(0))
    ctx.cue(CUES.IMPACT, 0, { x: c.x, y: c.y, z: c.z })
    // Impact frame: two inverted frames of pure silhouette. The core's light is gone in that
    // instant (it has been spent); the explosion's light arrives on the frame after.
    impactFrame(ctx, 0, 2)
    tl.set(state.core, { charge: 0, overload: 0 }, at(0))
    flash(ctx, 0.067, 0.8, 0.28)
    tl.set(i, { age: 0 }, at(0))
    tl.to(i, { age: 5.4, duration: 5.4, ease: 'none' }, at(0))
    tl.to(i, { light: 1, duration: 0.02 }, at(0.067))
    tl.to(i, { light: 0.12, duration: 2.2, ease: 'power3.out' }, at(0.15))
    tl.to(state.fx, { radial: 1, duration: 0.04 }, at(0.03))
    tl.to(state.fx, { radial: 0, duration: 1.3, ease: 'power2.out' }, at(0.25))
    tl.to(state.fx, { lens: 1, duration: 0.04 }, at(0))
    tl.to(state.fx, { lens: 0.2, duration: 1.6 }, at(0.3))
    shakeIf(ctx, 0.0, 1.0)

    // Hit-stop: both fighters hold for ~4 frames, then the expansion.
    pose(ctx, 'void', 'recoil', 0.0, 0.05, 'expo.out')
    tween(ctx, 'void', { hit: 1, phase: 0.6, energy: 1 }, 0, 0.03)
    ctx.cue(CUES.EXPLOSION, 0.13, { x: c.x, y: c.y, z: c.z })
    burst(ctx, BURST.SPARKS, c, 0.13, 2.2)
    ctx.cue(CUES.GRID_RIPPLE, 0.13, { x: c.x, z: c.z, strength: 2.0 })
    tl.to(i, { shock: 1, duration: 1.1, ease: 'power2.out' }, at(0.13))
    tl.to(i, { crater: 1, duration: 0.22, ease: 'expo.out' }, at(0.13))
    tl.to(i, { smoke: 1, duration: 2.4, ease: 'power2.out' }, at(0.3))
    tl.to(i, { smoke: 0.35, duration: 2.2, ease: 'sine.inOut' }, at(2.7))
    shot(ctx, 'IMPACT_WIDE', 0.14)

    // VOID is driven into the floor and folds.
    moveTo(ctx, 'void', MARKS.recoilTo, 0.13, 0.5, 'power3.out')
    tween(ctx, 'void', { hit: 0, energy: 0.3 }, 0.6, 1.2)
    tween(ctx, 'void', { phase: 0.12 }, 0.8, 1.2)
    pose(ctx, 'void', 'collapse', 0.75, 0.8, 'power2.out')

    // VELOCITY rebounds, rights itself, lands.
    if (motion.reduced) {
      moveTo(ctx, 'velocity', MARKS.heroLanding, 0.2, 1.0, 'power2.inOut')
      tween(ctx, 'velocity', { pitch: 0 }, 0.2, 0.8, 'power2.inOut')
    } else {
      arc(ctx, 'velocity', MARKS.heroLanding, 2.6, 0.13, 0.95)
      tween(ctx, 'velocity', { pitch: Math.PI * 2 }, 0.13, 0.8, 'power2.out')
      set(ctx, 'velocity', { pitch: 0 }, 0.94)
    }
    pose(ctx, 'velocity', 'flip', 0.2, 0.12)
    pose(ctx, 'velocity', 'heroLand', 1.0, 0.14, 'power3.out')
    ctx.cue(CUES.LAND, 1.08)
    burst(ctx, BURST.DUST, MARKS.heroLanding, 1.08, 1.2)
    shakeIf(ctx, 1.08, 0.3)
    set(ctx, 'velocity', { trails: 0 }, 1.2)
    tween(ctx, 'velocity', { energy: 0.6 }, 1.2, 1.0)

    // Aftermath.
    shot(ctx, 'AFTERMATH', 1.7)
    ctx.cue(CUES.AFTERMATH, 1.7)
    shot(ctx, 'AFTERMATH_PUSH', 1.72, { duration: 3.7, ease: 'sine.inOut' })
    tl.to(state.lights, { key: 0.55, ambient: 0.35, duration: 2.0 }, at(1.7))
    pose(ctx, 'velocity', 'idle', 2.9, 1.0, 'power2.inOut')
    tl.to(i, { crater: 0.75, duration: 2.5, ease: 'sine.inOut' }, at(2.4))
    tl.to(state.fx, { exposure: 0.55, duration: 1.6, ease: 'sine.in' }, at(3.8))
  },
}
