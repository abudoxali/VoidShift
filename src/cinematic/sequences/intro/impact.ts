import { shot } from '../../camera/shot'
import { BURST, CUES } from '../../engine/cues'
import type { PhaseSegment } from '../../engine/CinematicTimeline'
import { MARKS } from './marks'
import { arc, burst, face, flash, impactFrame, moveTo, pose, set, shakeIf, tween } from './moves'

const IMPACT_DURATION = 4.6

/**
 * SCENES 12 + 13 — IMPACT → AFTERMATH (4.6 s).
 * The order matters: the fighters stay readable first. Contact spark, NOX's recoil starting
 * (0–0.08 s) → two silhouette impact frames → the white-cyan flash → radial shockwave, light
 * blast, code + geometric debris, crater, dust → decay. NOX is driven down to one knee; AERON
 * rebounds and lands; the scarf falls; the world fades toward the next chapter.
 */
export const impactSegment: PhaseSegment = {
  phase: 'IMPACT',
  duration: IMPACT_DURATION,
  build(ctx) {
    const { tl, state, at, motion } = ctx
    const i = state.impact
    const c = MARKS.contact
    ctx.scene('impact', 'Impact', 0)

    // 1. Contact: a tight spark, both bodies readable. A tiny hold.
    shot(ctx, 'IMPACT_HERO', 0)
    tl.set(i.position, { x: c.x, y: c.y, z: c.z }, at(0))
    tl.set(i, { age: 0 }, at(0))
    tl.to(i, { age: IMPACT_DURATION, duration: IMPACT_DURATION, ease: 'none' }, at(0))
    ctx.cue(CUES.IMPACT, 0, { x: c.x, y: c.y, z: c.z })
    burst(ctx, BURST.SPARKS, c, 0.0, 0.7)
    tween(ctx, 'void', { hit: 1, energy: 1 }, 0, 0.03)
    pose(ctx, 'void', 'recoil', 0.02, 0.12, 'power3.out')
    face(ctx, 'void', 'pain', 0.02, 0.06)

    // 2. Impact frames (silhouettes), the core spent.
    impactFrame(ctx, 0.08, 2)
    tl.set(state.core, { charge: 0, overload: 0 }, at(0.08))

    // 3. Flash → expansion. Kept below a white-out: the bodies stay visible through the blast.
    flash(ctx, 0.15, 0.12, 0.14)
    tl.to(i, { light: 1, duration: 0.02 }, at(0.15))
    tl.to(i, { light: 0.12, duration: 2.0, ease: 'power3.out' }, at(0.3))
    // Rays only after the cut to the wide shot, where they frame the fighters instead of covering them.
    tl.to(state.fx, { radial: 0.15, duration: 0.04 }, at(0.3))
    tl.to(state.fx, { radial: 0, duration: 0.8, ease: 'power2.out' }, at(0.34))
    ctx.cue(CUES.EXPLOSION, 0.15, { x: c.x, y: c.y, z: c.z })
    burst(ctx, BURST.SPARKS, c, 0.15, 2.0)
    ctx.cue(CUES.GRID_RIPPLE, 0.15, { x: c.x, z: c.z, strength: 2.0 })
    tl.to(i, { shock: 1, duration: 1.1, ease: 'power2.out' }, at(0.15))
    tl.to(i, { crater: 1, duration: 0.22, ease: 'expo.out' }, at(0.15))
    tl.to(i, { smoke: 1, duration: 2.0, ease: 'power2.out' }, at(0.3))
    tl.to(i, { smoke: 0.4, duration: 1.6, ease: 'sine.inOut' }, at(2.4))
    tl.to(i, { crater: 0.75, duration: 2.0, ease: 'sine.inOut' }, at(2.4))
    shakeIf(ctx, 0.15, 1.0)
    shot(ctx, 'IMPACT_WIDE', 0.3)

    // NOX: driven down to one knee.
    moveTo(ctx, 'void', MARKS.noxDown, 0.15, 0.5, 'power3.out')
    tween(ctx, 'void', { hit: 0, energy: 0.3 }, 0.6, 1.0)
    tween(ctx, 'void', { phase: 0.12 }, 0.7, 1.0)
    pose(ctx, 'void', 'collapse', 0.7, 0.7, 'power2.out')

    // AERON: rebounds off the contact, rights himself, lands.
    if (motion.reduced) moveTo(ctx, 'velocity', MARKS.aeronLanding, 0.2, 0.9, 'sine.inOut')
    else arc(ctx, 'velocity', MARKS.aeronLanding, 2.1, 0.15, 0.85)
    tween(ctx, 'velocity', { pitch: 0 }, 0.15, 0.6, 'power2.out')
    pose(ctx, 'velocity', 'airTuck', 0.2, 0.15, 'power2.out')
    pose(ctx, 'velocity', 'heroLand', 0.95, 0.12, 'power3.out')
    ctx.cue(CUES.LAND, 1.0)
    burst(ctx, BURST.DUST, MARKS.aeronLanding, 1.0, 1.0)
    shakeIf(ctx, 1.0, 0.25)
    set(ctx, 'velocity', { trails: 0 }, 1.1)
    tween(ctx, 'velocity', { energy: 0.5 }, 1.1, 1.0)

    // Aftermath.
    ctx.scene('aftermath', 'Aftermath', 2.0)
    shot(ctx, 'AFTERMATH', 2.0)
    shot(ctx, 'AFTERMATH_PUSH', 2.02, { duration: IMPACT_DURATION - 2.02, ease: 'sine.inOut' })
    ctx.cue(CUES.AFTERMATH, 2.0)
    pose(ctx, 'velocity', 'recover', 2.6, 0.9, 'power2.inOut')
    face(ctx, 'velocity', 'recover', 1.0, 0.4)
    tl.to(state.lights, { key: 0.45, ambient: 0.25, duration: 1.6 }, at(2.0))
    tl.to(state.fx, { exposure: 0.3, duration: 1.3, ease: 'sine.in' }, at(IMPACT_DURATION - 1.3))
  },
}
