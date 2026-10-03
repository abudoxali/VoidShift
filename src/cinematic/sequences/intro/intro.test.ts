import { describe, expect, it } from 'vitest'
import { CinematicEngine, MAX_FRAME_DT } from '../../engine/CinematicEngine'
import { snapshotState } from '../../engine/CinematicState'
import { CUES } from '../../engine/cues'
import { FULL_MOTION, REDUCED_MOTION, type CinematicPhase, type MotionProfile, type ViewLayout } from '../../types'
import { INTRO_SEQUENCE } from '.'
import { MARKS } from './marks'

const make = (motion: MotionProfile = FULL_MOTION, layout: ViewLayout = 'landscape') =>
  new CinematicEngine({ sequence: INTRO_SEQUENCE, motion, layout })

const span = (e: CinematicEngine, phase: CinematicPhase) => e.phases.find((p) => p.phase === phase)!
const cueTime = (e: CinematicEngine, name: string) => e.cues.find((c) => c.name === name)!.time

/** Plays with a fixed 60 Hz step from `from` to `to` (absolute seconds). */
function playRange(e: CinematicEngine, from: number, to: number, each?: (e: CinematicEngine) => void) {
  e.seek(from)
  e.fixedDelta = 1 / 60
  while (e.time < to - 1e-9 || (to >= e.duration && !e.isComplete)) {
    e.update(0)
    each?.(e)
  }
}

describe('INTRO — structure', () => {
  it('lays out the nine beats contiguously, 20–28 s in total', () => {
    const e = make()
    expect(e.phases.map((p) => p.phase)).toEqual(['BOOT', 'REVEAL', 'SPAWN', 'ENGAGE', 'PHASE', 'TELEPORT', 'LOCK', 'CORE_CHARGE', 'IMPACT'])
    expect(e.phases[0].start).toBe(0)
    for (let i = 1; i < e.phases.length; i++) expect(e.phases[i].start).toBeCloseTo(e.phases[i - 1].end, 10)
    expect(e.duration).toBeGreaterThanOrEqual(20)
    expect(e.duration).toBeLessThanOrEqual(28)
  })

  it('tells the story in order: reveal → exchange → teleport → reversal → core → impact → explosion', () => {
    const e = make()
    const order = [
      CUES.VELOCITY_ASSEMBLE,
      CUES.VOID_OPEN,
      CUES.VELOCITY_DASH,
      CUES.VOID_PHASE,
      CUES.CLASH,
      CUES.ANCHOR_THROW,
      CUES.ANCHOR_PLANT,
      CUES.TELEPORT_OUT,
      CUES.TELEPORT_IN,
      CUES.VOID_REALIZE,
      CUES.CORE_FORM,
      CUES.VOID_PHASE_FAIL,
      CUES.IMPACT,
      CUES.EXPLOSION,
    ]
    const times = order.map((name) => cueTime(e, name))
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1])
    expect(cueTime(e, CUES.IMPACT)).toBeCloseTo(span(e, 'IMPACT').start, 10)
  })

  it('never drives one property with two overlapping tweens (which would pop / break determinism)', () => {
    expect(make().overlaps()).toEqual([])
    expect(make(REDUCED_MOTION).overlaps()).toEqual([])
    expect(make(FULL_MOTION, 'portrait').overlaps()).toEqual([])
  })

  it('cuts between many intentional shots (no single drifting camera)', () => {
    const e = make()
    const cuts = e.cues.filter((c) => c.name === CUES.CAMERA_CUT)
    expect(cuts.length).toBeGreaterThanOrEqual(20)
  })
})

describe('INTRO — determinism', () => {
  for (const t of [3.3, 6.45, 10.4, 13.5, 16.2, 18.3, 21.0]) {
    it(`fixed-step playback equals seeking at t=${t}`, () => {
      const a = make()
      playRange(a, Math.max(0, t - 2.5), t)
      const b = make()
      b.seek(a.time)
      expect(snapshotState(b.state)).toEqual(snapshotState(a.state))
    })
  }

  it('backward and forward seeks reproduce the same state', () => {
    const e = make()
    e.seek(17.3)
    const first = snapshotState(e.state)
    e.seek(2)
    e.seek(22)
    e.seek(9)
    e.seek(17.3)
    expect(snapshotState(e.state)).toEqual(first)
  })

  it('replay restores the initial frame', () => {
    const e = make()
    const initial = snapshotState(e.state)
    e.seek(19)
    expect(e.state.impact.age).toBeGreaterThan(0)
    e.replay()
    expect(snapshotState(e.state)).toEqual(initial)
    expect(e.state.impact.age).toBe(-1)
    expect(e.state.anchor.visible).toBe(0)
    expect(e.state.core.charge).toBe(0)
  })

  it('fires every cue exactly once, in order, during playback', () => {
    const e = make()
    const seen: string[] = []
    e.on('cue', (c) => seen.push(c.name))
    playRange(e, 0, e.duration)
    expect(e.isComplete).toBe(true)
    expect(seen).toEqual(e.cues.map((c) => c.name))
  })

  it('suppresses cues while seeking or skipping', () => {
    const e = make()
    let fired = 0
    e.on('cue', () => fired++)
    e.seek(12)
    e.seek(20)
    e.skip()
    expect(fired).toBe(0)
  })

  it('emits phase changes in order', () => {
    const e = make()
    const seen: CinematicPhase[] = []
    e.on('phase', (p) => seen.push(p))
    e.fixedDelta = 1 / 60
    while (!e.isComplete) e.update(0)
    expect(seen).toEqual(['REVEAL', 'SPAWN', 'ENGAGE', 'PHASE', 'TELEPORT', 'LOCK', 'CORE_CHARGE', 'IMPACT'])
  })

  it('clamps large frame gaps so choreography cannot be skipped by a stall', () => {
    const e = make()
    e.update(5)
    expect(e.time).toBeCloseTo(MAX_FRAME_DT, 10)
  })
})

describe('INTRO — choreography', () => {
  it('reveals both fighters before the standoff and keeps them apart until the first exchange', () => {
    const e = make()
    e.seek(span(e, 'SPAWN').start + 0.2)
    const { velocity, void: vd } = e.state.fighters
    expect(velocity.reveal).toBeCloseTo(1, 3)
    expect(vd.reveal).toBeCloseTo(1, 3)
    expect(velocity.position.distanceTo(vd.position)).toBeGreaterThan(4)
  })

  it('the first dash is impossibly fast and passes through a phased VOID', () => {
    const e = make()
    const dash = cueTime(e, CUES.VELOCITY_DASH)
    let peak = 0
    let phaseAtPass = 0
    playRange(e, dash - 0.1, dash + 0.6, (x) => {
      peak = Math.max(peak, x.derived.velocitySpeed)
      if (Math.abs(x.state.fighters.velocity.position.x - x.state.fighters.void.position.x) < 0.3) phaseAtPass = Math.max(phaseAtPass, x.state.fighters.void.phase)
    })
    expect(peak).toBeGreaterThan(20)
    expect(phaseAtPass).toBeGreaterThan(0.6)
  })

  it('limbs actually animate: poses change many times per fighter', () => {
    const e = make()
    const poses = { velocity: new Set<string>(), void: new Set<string>() }
    playRange(e, 0, e.duration, (x) => {
      poses.velocity.add(x.state.fighters.velocity.pose)
      poses.void.add(x.state.fighters.void.pose)
    })
    expect(poses.velocity.size).toBeGreaterThanOrEqual(12)
    expect(poses.void.size).toBeGreaterThanOrEqual(7)
  })

  it('teleport: the anchor plants behind VOID, VELOCITY vanishes and reconstructs at it', () => {
    const e = make()
    e.seek(cueTime(e, CUES.ANCHOR_PLANT) + 0.05)
    expect(e.state.anchor.planted).toBeGreaterThan(0.3)
    expect(e.state.anchor.position.x).toBeGreaterThan(e.state.fighters.void.position.x)
    e.seek(cueTime(e, CUES.TELEPORT_OUT) + 0.1)
    expect(e.state.fighters.velocity.reveal).toBeLessThan(0.05)
    e.seek(cueTime(e, CUES.TELEPORT_IN) + 0.35)
    const v = e.state.fighters.velocity
    expect(v.reveal).toBeGreaterThan(0.9)
    expect(Math.hypot(v.position.x - MARKS.anchorPlant.x, v.position.z - MARKS.anchorPlant.z)).toBeLessThan(0.5)
  })

  it('the Code Core charges in VELOCITY’s hand, inverted above VOID, and is spent on contact', () => {
    const e = make()
    e.seek(span(e, 'CORE_CHARGE').start + 1.8)
    const v = e.state.fighters.velocity
    expect(e.state.core.charge).toBeGreaterThan(0.95)
    expect(Math.abs(Math.cos(v.pitch) + 1)).toBeLessThan(0.1) // upside down
    expect(v.position.y).toBeGreaterThan(1.5)
    e.seek(span(e, 'IMPACT').start + 0.01)
    expect(e.state.core.charge).toBe(0)
    expect(e.state.fx.invert).toBe(1)
  })

  it('impact → explosion → decay → aftermath', () => {
    const e = make()
    const t0 = span(e, 'IMPACT').start
    e.seek(t0 + 0.12)
    const peakLight = e.state.impact.light
    expect(peakLight).toBeGreaterThan(0.9)
    e.seek(t0 + 0.6)
    expect(e.state.impact.shock).toBeGreaterThan(0.5)
    expect(e.state.impact.crater).toBeGreaterThan(0.9)
    e.seek(t0 + 1.6)
    expect(e.state.fighters.void.pose).toBe('collapse')
    expect(e.state.impact.light).toBeLessThan(peakLight)
    e.skip()
    expect(e.state.impact.light).toBeLessThan(0.3)
    expect(e.state.impact.smoke).toBeGreaterThan(0.2)
    expect(e.state.fighters.velocity.pose).toBe('idle')
    expect(e.state.fighters.velocity.pitch).toBe(0)
  })
})

describe('INTRO — reduced motion and layout', () => {
  it('reduced motion: no shake, impact frames or speed lines; softened flashes; nothing moves fast', () => {
    const e = make(REDUCED_MOTION)
    expect(e.cues.some((c) => c.name === CUES.CAMERA_SHAKE)).toBe(false)
    let invert = 0
    let speed = 0
    let peak = 0
    let flash = 0
    playRange(e, 0, e.duration, (x) => {
      invert = Math.max(invert, x.state.fx.invert)
      speed = Math.max(speed, x.state.fx.speed)
      flash = Math.max(flash, x.state.fx.flash)
      peak = Math.max(peak, x.derived.velocitySpeed)
    })
    expect(invert).toBe(0)
    expect(speed).toBe(0)
    expect(flash).toBeLessThanOrEqual(0.25)
    expect(peak).toBeLessThan(10)
  })

  it('switching motion profiles mid-sequence preserves progress and stays deterministic', () => {
    const e = make()
    playRange(e, 0, 8)
    const progress = e.time / e.duration
    e.setMotion(REDUCED_MOTION)
    expect(e.time / e.duration).toBeCloseTo(progress, 6)
    const fresh = make(REDUCED_MOTION)
    fresh.seek(e.time)
    expect(snapshotState(e.state)).toEqual(snapshotState(fresh.state))
  })

  it('portrait recomposes only the camera: the choreography is identical', () => {
    for (const t of [5, 11, 16.5, 20]) {
      const land = make()
      const port = make(FULL_MOTION, 'portrait')
      land.seek(t)
      port.seek(t)
      const a = snapshotState(land.state) as Record<string, unknown>
      const b = snapshotState(port.state) as Record<string, unknown>
      expect(b.fighters).toEqual(a.fighters)
      expect(b.impact).toEqual(a.impact)
      expect(b.camera).not.toEqual(a.camera)
    }
  })
})
