import { Vector3 } from 'three'
import { shake, shot } from '../../camera/shot'
import { VOID_HOME } from '../../engine/CinematicState'
import { CUES } from '../../engine/cues'
import type { PhaseSegment, SegmentContext } from '../../engine/CinematicTimeline'
import { ATTACK_1, ATTACK_2, pitchTowards, yawTowards } from '../../engine/staging'
import { moveTo, publishVector, reconstructAt } from './moves'

/** Beat times (segment-local seconds) for both motion profiles. */
export function phaseBeats(reduced: boolean) {
  const crawl = reduced ? 1.1 : 0.6
  const recover1 = crawl + (reduced ? 0.95 : 0.4)
  const second = reduced ? 4.1 : 3.2
  const launch2 = second + 1.85
  const contact2 = launch2 + (reduced ? 0.05 : 0.12)
  const recover2 = contact2 + (reduced ? 1.1 : 0.4)
  return { contact1: 0, crawl, exit1: crawl, recover1, second, launch2, contact2, recover2, duration: reduced ? 11.4 : 10.5 }
}

const toVoidFrom = (p: Vector3) => VOID_HOME.clone().sub(p).normalize()

function flash(ctx: SegmentContext, local: number, amount: number): void {
  const fx = ctx.state.fx
  if (ctx.motion.reduced) return
  ctx.tl.to(fx, { flash: amount * ctx.motion.flash, duration: 0.025 }, ctx.at(local))
  ctx.tl.to(fx, { flash: 0, duration: 0.25, ease: 'power2.out' }, ctx.at(local + 0.025))
}

/**
 * PHASE — the expected collision does not happen.
 *
 * Exchange 1 (deception by dilation): at contact the camera cuts side-on. Inside the VOID's
 * volume time is wrong — the vector that crossed the world in 0.15 s crawls through 1.2 units
 * in 0.6 s while the core folds its interior into mirrored copies of space, inverts its field,
 * desynchronises the image along the attack line and flips its shell fragments to contradictory
 * positions. Then the vector is released on the far side at full speed, fragmented.
 *
 * Recovery: hard deceleration, a look back at an intact VOID, "COLLISION FALSE".
 *
 * Exchange 2 (adaptation): VELOCITY re-positions above, computes a new vector and dives. This
 * time the VOID does not dilate — space parts along the attack line ahead of it, the vector
 * passes through the gap, and the seam closes behind it. Two vectors, zero contact.
 */
export const phaseSegment: PhaseSegment = {
  phase: 'PHASE',
  duration: (motion) => phaseBeats(motion.reduced).duration,
  build(ctx) {
    const { tl, state, at, motion } = ctx
    const R = motion.reduced
    const b = phaseBeats(R)
    const v = state.velocity
    const vd = state.void
    const a = state.attack
    const fx = state.fx

    // ── CONTACT 1 ──────────────────────────────────────────────────────────
    ctx.cue(CUES.VOID_PHASE, 0, { exchange: 1 })
    ctx.cue(CUES.GRID_RIPPLE, 0, { x: VOID_HOME.x, z: VOID_HOME.z, strength: 0.9 })
    shot(ctx, 'INTERSECTION', 0)
    shot(ctx, 'INTERSECTION_PUSH', 0.02, { duration: b.crawl, ease: 'none' })
    moveTo(ctx, ATTACK_1.inner, 0, b.crawl, R ? 'sine.inOut' : 'none')
    tl.to(v, { interference: 1, duration: 0.06 }, at(0))
    tl.to(vd, { desync: R ? 0.35 : 1, duration: 0.05 }, at(0))
    tl.to(vd, { desync: 0, duration: 0.5, ease: 'power2.out' }, at(b.crawl + 0.1))
    tl.to(vd, { inversion: 0.55, duration: R ? 0.5 : 0.18, ease: 'expo.out' }, at(0))
    tl.to(vd, { inversion: 0, duration: 1.0, ease: 'power2.inOut' }, at(b.crawl + 0.15))
    if (!R) {
      // One short exposure event: light falls into the folded core for two frames.
      tl.to(fx, { exposure: 0.55, duration: 0.02 }, at(0))
      tl.to(fx, { exposure: 1, duration: 0.3, ease: 'power2.out' }, at(0.04))
    }
    shake(ctx, 0, 0.28)

    // ── PASS-THROUGH 1 ─────────────────────────────────────────────────────
    ctx.cue(CUES.VELOCITY_PASSTHROUGH, b.exit1, { exchange: 1 })
    moveTo(ctx, ATTACK_1.exit, b.exit1, R ? 0.9 : 0.3, R ? 'power2.out' : 'expo.out')
    flash(ctx, b.exit1, 0.06)
    shake(ctx, b.exit1 + 0.02, 0.5)
    tl.to(v, { assemble: 0.45, duration: 0.08 }, at(b.exit1))
    tl.to(v, { interference: 0.3, duration: 0.5 }, at(b.exit1 + 0.1))
    ctx.cue(CUES.GRID_RIPPLE, b.exit1 + 0.25, { x: ATTACK_1.exit.x, z: ATTACK_1.exit.z, strength: 0.7 })
    shot(ctx, 'RECOVERY', b.exit1 + 0.03, { duration: 1.5, ease: 'power3.out' })
    tl.to(vd, { phase: 0.3, duration: 1.2, ease: 'power2.out' }, at(b.exit1 + 0.3))

    // ── RECOVERY 1 ─────────────────────────────────────────────────────────
    const r1 = b.recover1
    moveTo(ctx, ATTACK_1.settle, r1, 0.35, 'power2.out')
    tl.set(v, { ghosts: 0 }, at(r1))
    ctx.cue(CUES.VELOCITY_RECOVER, r1 + 0.45)
    const back = toVoidFrom(ATTACK_1.settle)
    tl.to(v, { heading: yawTowards(back.x, back.z), pitch: pitchTowards(back), duration: 0.4, ease: 'power3.inOut' }, at(r1 + 0.45))
    tl.to(v, { assemble: 1, duration: 1.3, ease: 'expo.out' }, at(r1 + 0.2))
    tl.to(a, { result: 1, duration: 0.6, ease: 'none' }, at(r1 + 0.6))
    tl.to(v, { interference: 0.08, energy: 0.6, duration: 0.8 }, at(r1 + 0.8))
    tl.to(a, { lock: 0, duration: 0.3 }, at(r1 + 1.2))
    tl.to(a, { draw: 0, duration: 0.5, ease: 'power2.in' }, at(r1 + 1.5))
    tl.to(a, { visible: 0, duration: 0.2 }, at(r1 + 1.9))

    // ── EXCHANGE 2: adaptation ─────────────────────────────────────────────
    const s2 = b.second
    tl.to(a, { result: 0, duration: 0.25 }, at(s2 - 0.1))
    if (R) {
      reconstructAt(ctx, ATTACK_2.origin, s2, 0.35)
    } else {
      tl.set(v, { ghosts: 1 }, at(s2 - 0.02))
      moveTo(ctx, ATTACK_2.origin, s2, 0.42, 'expo.inOut')
      tl.set(v, { ghosts: 0 }, at(s2 + 0.5))
    }
    tl.to(v, { heading: yawTowards(ATTACK_2.dir.x, ATTACK_2.dir.z), pitch: pitchTowards(ATTACK_2.dir), duration: 0.35, ease: 'power3.inOut' }, at(s2 + 0.3))
    shot(ctx, 'SECOND_SETUP', s2, { duration: 1.3, ease: 'power3.inOut' })
    publishVector(ctx, 2, ATTACK_2.origin, ATTACK_2.predictedEnd, s2 + 0.45)
    ctx.cue(CUES.VELOCITY_LOCK, s2 + 0.5)
    tl.to(v, { focus: 1, energy: 0.9, duration: 0.4, ease: 'power3.inOut' }, at(s2 + 0.5))
    tl.to(a, { visible: 1, duration: 0.15 }, at(s2 + 0.55))
    tl.to(a, { draw: 1, duration: 0.45, ease: 'expo.out' }, at(s2 + 0.6))
    tl.to(a, { lock: 1, duration: 0.5, ease: 'none' }, at(s2 + 0.7))

    const L2 = b.launch2
    const c2 = b.contact2
    if (R) {
      ctx.cue(CUES.VELOCITY_LAUNCH, L2 - 0.4)
      reconstructAt(ctx, ATTACK_2.entry, L2 - 0.4, 0.3)
    } else {
      moveTo(ctx, ATTACK_2.windup, L2 - 0.4, 0.38, 'power2.out')
      ctx.cue(CUES.VELOCITY_LAUNCH, L2)
      tl.set(v, { ghosts: 1 }, at(L2 - 0.02))
      moveTo(ctx, ATTACK_2.entry, L2, c2 - L2, 'expo.in')
      shake(ctx, L2, 0.15)
    }

    // The VOID parts space along the attack line BEFORE contact: the vector meets a gap.
    ctx.cue(CUES.VOID_SPLIT, R ? c2 - 0.5 : c2 - 0.08)
    tl.to(vd, { fold: 1, duration: R ? 0.5 : 0.1, ease: 'expo.out' }, at(R ? c2 - 0.5 : c2 - 0.08))
    tl.to(vd, { phase: 0.8, duration: 0.15 }, at(c2 - 0.1))
    ctx.cue(CUES.VOID_PHASE, c2, { exchange: 2 })
    // Frame-level accent: hard cut to the split, held through the pass.
    shot(ctx, 'SPLIT_HERO', c2 - (R ? 0.6 : 0.02))
    moveTo(ctx, ATTACK_2.exit, c2, R ? 1.0 : 0.32, R ? 'power1.inOut' : 'expo.out')
    ctx.cue(CUES.VELOCITY_PASSTHROUGH, c2 + (R ? 0.5 : 0.06), { exchange: 2 })
    tl.to(vd, { inversion: 1, duration: R ? 0.4 : 0.08 }, at(c2 + 0.05))
    tl.to(vd, { inversion: 0, duration: 1.0, ease: 'power2.inOut' }, at(c2 + (R ? 0.5 : 0.15)))
    tl.to(v, { assemble: 0.55, duration: 0.08 }, at(c2 + 0.05))
    tl.to(v, { focus: 0, duration: 0.3 }, at(c2))
    shake(ctx, c2 + 0.05, 0.45)
    ctx.cue(CUES.GRID_RIPPLE, c2 + 0.05, { x: VOID_HOME.x, z: VOID_HOME.z, strength: 1.2 })
    ctx.cue(CUES.GRID_RIPPLE, c2 + (R ? 1.0 : 0.3), { x: ATTACK_2.exit.x, z: ATTACK_2.exit.z, strength: 0.8 })
    tl.to(vd, { fold: 0, duration: 0.7, ease: 'power3.inOut' }, at(c2 + (R ? 1.1 : 0.35)))

    // ── RECOVERY 2 → held tension ─────────────────────────────────────────
    const r2 = b.recover2
    moveTo(ctx, ATTACK_2.settle, r2, 0.5, 'power2.out')
    tl.set(v, { ghosts: 0 }, at(r2 + 0.3))
    ctx.cue(CUES.VELOCITY_RECOVER, r2 + 0.5)
    const back2 = toVoidFrom(ATTACK_2.settle)
    tl.to(v, { heading: yawTowards(back2.x, back2.z), pitch: pitchTowards(back2), duration: 0.45, ease: 'power3.inOut' }, at(r2 + 0.5))
    tl.to(v, { assemble: 1, duration: 1.2, ease: 'expo.out' }, at(r2 + 0.3))
    tl.to(a, { result: 1, duration: 0.6, ease: 'none' }, at(r2 + 0.9))
    tl.to(vd, { phase: 0.4, duration: 1.5, ease: 'power2.out' }, at(r2 + 0.4))
    tl.to(v, { interference: 0.12, energy: 0.55, duration: 1.0 }, at(r2 + 0.6))
    shot(ctx, 'FINAL_TENSION', r2 + 0.2, { duration: 2.8, ease: 'power3.inOut' })
    tl.to(a, { draw: 0, lock: 0, duration: 0.8 }, at(r2 + 1.8))
    tl.to(v, { idle: 1, duration: 1.0, ease: 'power1.inOut' }, at(r2 + 1.6))
  },
}
