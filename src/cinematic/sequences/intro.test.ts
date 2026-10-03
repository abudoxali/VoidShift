import { describe, expect, it } from 'vitest'
import { CinematicEngine } from '../engine/CinematicEngine'
import { VOID_HOME, snapshotState } from '../engine/CinematicState'
import { CUES } from '../engine/cues'
import { ATTACK_1 } from '../engine/staging'
import { FULL_MOTION, REDUCED_MOTION, type MotionProfile, type ViewLayout } from '../types'
import { ENGAGE_DURATION, ENGAGE_LAUNCH } from './combat/engage'
import { phaseBeats } from './combat/phase'
import { INTRO_SEQUENCE } from './intro'

const make = (motion: MotionProfile = FULL_MOTION, layout: ViewLayout = 'landscape') =>
  new CinematicEngine({ sequence: INTRO_SEQUENCE, motion, layout })

const span = (e: CinematicEngine, phase: string) => e.phases.find((p) => p.phase === phase)!

/** Plays with a fixed 60 Hz step from `from` to `to` (absolute seconds). */
function playRange(e: CinematicEngine, from: number, to: number, each?: (e: CinematicEngine) => void) {
  e.seek(from)
  e.fixedDelta = 1 / 60
  while (e.time < to - 1e-9 || (to >= e.duration && !e.isComplete)) {
    e.update(0)
    each?.(e)
  }
}

describe('INTRO sequence — ENGAGE + PHASE structure', () => {
  it('appends ENGAGE and PHASE contiguously after SPAWN', () => {
    const e = make()
    expect(e.phases.map((p) => p.phase)).toEqual(['BOOT', 'REVEAL', 'SPAWN', 'ENGAGE', 'PHASE'])
    expect(span(e, 'ENGAGE').start).toBeCloseTo(span(e, 'SPAWN').end, 10)
    expect(span(e, 'PHASE').start).toBeCloseTo(span(e, 'ENGAGE').end, 10)
    expect(span(e, 'ENGAGE').end - span(e, 'ENGAGE').start).toBeCloseTo(ENGAGE_DURATION, 10)
    expect(span(e, 'PHASE').end - span(e, 'PHASE').start).toBeCloseTo(phaseBeats(false).duration, 10)
    expect(e.duration).toBeCloseTo(span(e, 'PHASE').end, 10)
  })

  it('schedules the combat cues in narrative order', () => {
    const e = make()
    const combat = new Set<string>([
      CUES.VELOCITY_LOCK,
      CUES.VELOCITY_LAUNCH,
      CUES.VOID_PHASE,
      CUES.VELOCITY_PASSTHROUGH,
      CUES.VELOCITY_RECOVER,
      CUES.VOID_SPLIT,
    ])
    const names = e.cues.filter((c) => combat.has(c.name)).map((c) => c.name)
    expect(names).toEqual([
      CUES.VELOCITY_LOCK,
      CUES.VELOCITY_LAUNCH,
      CUES.VOID_PHASE,
      CUES.VELOCITY_PASSTHROUGH,
      CUES.VELOCITY_RECOVER,
      CUES.VELOCITY_LOCK,
      CUES.VELOCITY_LAUNCH,
      CUES.VOID_SPLIT,
      CUES.VOID_PHASE,
      CUES.VELOCITY_PASSTHROUGH,
      CUES.VELOCITY_RECOVER,
    ])
    // The first contact lands exactly at the ENGAGE → PHASE boundary.
    const contact = e.cues.find((c) => c.name === CUES.VOID_PHASE)!
    expect(contact.time).toBeCloseTo(span(e, 'PHASE').start, 10)
  })
})

describe('INTRO sequence — determinism', () => {
  for (const t of [19.4, 21.7, 22.1, 24.0, 27.0, 31.5]) {
    it(`fixed-step playback equals seeking at t=${t}`, () => {
      const a = make()
      playRange(a, 17.0, t)
      const b = make()
      b.seek(a.time)
      expect(snapshotState(b.state)).toEqual(snapshotState(a.state))
    })
  }

  it('backward and forward seeks inside PHASE reproduce the same state', () => {
    const e = make()
    e.seek(27.0)
    const first = snapshotState(e.state)
    e.seek(18)
    e.seek(31)
    e.seek(22)
    e.seek(27.0)
    expect(snapshotState(e.state)).toEqual(first)
  })

  it('replay resets all phase / attack state', () => {
    const e = make()
    const initial = snapshotState(e.state)
    e.seek(27.0)
    expect(e.state.void.fold).toBeGreaterThan(0.5)
    e.replay()
    expect(snapshotState(e.state)).toEqual(initial)
    expect(e.state.void.phase).toBe(0)
    expect(e.state.attack.index).toBe(0)
    expect(e.state.camera.fit).toBe(1)
  })

  it('suppresses cues while seeking across the combat', () => {
    const e = make()
    let fired = 0
    e.on('cue', () => fired++)
    e.seek(18)
    e.seek(30)
    e.skip()
    expect(fired).toBe(0)
  })

  it('fires each combat cue exactly once in a full fixed-step playback', () => {
    const e = make()
    const seen: string[] = []
    e.on('cue', (c) => seen.push(c.name))
    playRange(e, 0, e.duration)
    expect(e.isComplete).toBe(true)
    expect(seen).toEqual(e.cues.map((c) => c.name))
  })
})

describe('INTRO sequence — choreography', () => {
  const engageStart = 17.2

  it('commits the camera: lineup, CHASE at launch, side-on FREEZE at contact, ORBIT hold at the end', () => {
    const e = make()
    e.seek(engageStart + 3.6)
    expect(e.state.camera.mode).toBe('TRACK')
    e.seek(engageStart + ENGAGE_LAUNCH + 0.08)
    expect(e.state.camera.mode).toBe('CHASE')
    expect(e.state.camera.track).toBe('velocity')
    e.seek(span(e, 'PHASE').start + 0.1)
    expect(e.state.camera.mode).toBe('FREEZE')
    e.skip()
    expect(e.state.camera.mode).toBe('ORBIT')
  })

  it('stillness → decision → impossible speed', () => {
    const e = make()
    let stillPeak = 0
    playRange(e, engageStart + 0.9, engageStart + 1.3, (x) => (stillPeak = Math.max(stillPeak, x.derived.velocitySpeed)))
    expect(stillPeak).toBeLessThan(0.5)
    expect(e.state.velocity.idle).toBeLessThan(0.05)
    let attackPeak = 0
    playRange(e, engageStart + ENGAGE_LAUNCH, engageStart + ENGAGE_DURATION, (x) => (attackPeak = Math.max(attackPeak, x.derived.velocitySpeed)))
    expect(attackPeak).toBeGreaterThan(40)
    expect(e.state.velocity.ghosts).toBe(1)
  })

  it('the vector passes THROUGH the VOID, which stays intact (failed collision)', () => {
    const e = make()
    const contact = span(e, 'PHASE').start
    const b = phaseBeats(false)
    e.seek(contact)
    expect(e.state.void.phase).toBeGreaterThan(0.9)
    e.seek(contact + b.crawl * 0.5)
    expect(e.state.velocity.position.distanceTo(VOID_HOME)).toBeLessThan(0.42 * 1.5)
    e.seek(contact + b.recover1)
    const along = e.state.velocity.position.clone().sub(VOID_HOME).dot(ATTACK_1.dir)
    expect(along).toBeGreaterThan(2.5)
    expect(e.state.void.mass).toBeCloseTo(1)
    expect(e.state.void.reveal).toBeCloseTo(1)
    e.seek(contact + b.recover1 + 1.3)
    expect(e.state.attack.result).toBeCloseTo(1)
  })

  it('the second exchange meets a split, and the hold establishes 0 hits out of 2', () => {
    const e = make()
    const contact = span(e, 'PHASE').start
    const b = phaseBeats(false)
    e.seek(contact + b.contact2)
    expect(e.state.void.fold).toBeGreaterThan(0.9)
    expect(e.state.attack.index).toBe(2)
    e.skip()
    expect(e.state.void.fold).toBe(0)
    expect(e.state.void.phase).toBeCloseTo(0.4)
    expect(e.state.attack.result).toBeCloseTo(1)
    expect(e.state.void.mass).toBeCloseTo(1)
  })
})

describe('INTRO sequence — reduced motion and layout', () => {
  it('reduced motion keeps every beat but removes speed, chase and shake', () => {
    const e = make(REDUCED_MOTION)
    expect(e.cues.some((c) => c.name === CUES.CAMERA_SHAKE)).toBe(false)
    let peak = 0
    let chased = false
    let peakFlash = 0
    playRange(e, span(e, 'ENGAGE').start, e.duration, (x) => {
      peak = Math.max(peak, x.derived.velocitySpeed)
      peakFlash = Math.max(peakFlash, x.state.fx.flash)
      if (x.state.camera.mode === 'CHASE') chased = true
    })
    expect(peak).toBeLessThan(10)
    expect(chased).toBe(false)
    expect(peakFlash).toBe(0)
    const contact = span(e, 'PHASE').start
    e.seek(contact + 0.1)
    expect(e.state.void.phase).toBeGreaterThan(0.9)
    e.seek(contact + phaseBeats(true).contact2)
    expect(e.state.void.fold).toBeGreaterThan(0.9)
    e.skip()
    expect(e.state.attack.result).toBeCloseTo(1)
  })

  it('switching motion profile mid-PHASE preserves progress deterministically', () => {
    const e = make()
    e.seek(24)
    const progress = e.time / e.duration
    e.setMotion(REDUCED_MOTION)
    expect(e.time / e.duration).toBeCloseTo(progress, 6)
    const fresh = make(REDUCED_MOTION)
    fresh.seek(e.time)
    expect(snapshotState(e.state)).toEqual(snapshotState(fresh.state))
  })

  it('portrait compiles purpose-built shots: only the camera differs', () => {
    const land = make()
    const port = make(FULL_MOTION, 'portrait')
    expect(port.duration).toBeCloseTo(land.duration, 10)
    for (const t of [18, 20.2, 24, 31.8]) {
      land.seek(t)
      port.seek(t)
      expect(port.state.camera.position.distanceTo(land.state.camera.position)).toBeGreaterThan(0.5)
      const { camera: _a, ...l } = snapshotState(land.state)
      const { camera: _b, ...p } = snapshotState(port.state)
      expect(p).toEqual(l)
    }
    port.seek(31.8)
    expect(port.state.camera.fit).toBe(0)
  })

  it('switching layout mid-sequence matches a fresh portrait engine', () => {
    const e = make()
    e.seek(23.3)
    e.setLayout('portrait')
    const fresh = make(FULL_MOTION, 'portrait')
    fresh.seek(e.time)
    expect(snapshotState(e.state)).toEqual(snapshotState(fresh.state))
  })
})
