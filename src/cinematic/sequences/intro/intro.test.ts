import { describe, expect, it } from 'vitest'
import { CinematicEngine, MAX_FRAME_DT } from '../../engine/CinematicEngine'
import { snapshotState } from '../../engine/CinematicState'
import { CUES } from '../../engine/cues'
import { FULL_MOTION, REDUCED_MOTION, type CinematicPhase, type MotionProfile, type ViewLayout } from '../../types'
import { INTRO_SEQUENCE } from '.'
import { MARKS } from './marks'

const make = (motion: MotionProfile = FULL_MOTION, layout: ViewLayout = 'landscape') =>
  new CinematicEngine({ sequence: INTRO_SEQUENCE, motion, layout })

const cueTime = (e: CinematicEngine, name: string) => e.cues.find((c) => c.name === name)!.time
const sceneTime = (e: CinematicEngine, id: string) => e.scenes.find((s) => s.id === id)!.time

/** Plays with a fixed 60 Hz step from `from` to `to` (absolute seconds). */
function playRange(e: CinematicEngine, from: number, to: number, each?: (e: CinematicEngine) => void) {
  e.seek(from)
  e.fixedDelta = 1 / 60
  while (e.time < to - 1e-9 || (to >= e.duration && !e.isComplete)) {
    e.update(0)
    each?.(e)
  }
}

const SCENES = ['arrival', 'standoff', 'first-attack', 'close-combat', 'strategy', 'anchor', 'second-attack', 'teleport', 'reversal', 'core', 'strike', 'impact', 'aftermath']

describe('INTRO — structure', () => {
  it('lays out the nine phases contiguously, 18–24 s in total', () => {
    const e = make()
    expect(e.phases.map((p) => p.phase)).toEqual(['BOOT', 'REVEAL', 'SPAWN', 'ENGAGE', 'PHASE', 'TELEPORT', 'LOCK', 'CORE_CHARGE', 'IMPACT'])
    expect(e.phases[0].start).toBe(0)
    for (let i = 1; i < e.phases.length; i++) expect(e.phases[i].start).toBeCloseTo(e.phases[i - 1].end, 10)
    expect(e.duration).toBeGreaterThanOrEqual(18)
    expect(e.duration).toBeLessThanOrEqual(24)
  })

  it('declares the thirteen scenes in story order', () => {
    const e = make()
    expect(e.scenes.map((s) => s.id)).toEqual(SCENES)
    for (let i = 1; i < e.scenes.length; i++) expect(e.scenes[i].time).toBeGreaterThan(e.scenes[i - 1].time)
  })

  it('cause → effect: attack, phase, counter, anchor, teleport, core, impact, explosion, aftermath', () => {
    const e = make()
    const order = [
      CUES.VELOCITY_ASSEMBLE,
      CUES.VELOCITY_DASH,
      CUES.VOID_PHASE,
      CUES.VOID_COUNTER,
      CUES.CLASH,
      CUES.VOID_GRAB,
      CUES.ANCHOR_FORM,
      CUES.ANCHOR_THROW,
      CUES.ANCHOR_PLANT,
      CUES.TELEPORT_OUT,
      CUES.TELEPORT_IN,
      CUES.VOID_REALIZE,
      CUES.CORE_FORM,
      CUES.VOID_PHASE_FAIL,
      CUES.IMPACT,
      CUES.EXPLOSION,
      CUES.AFTERMATH,
    ]
    const times = order.map((name) => cueTime(e, name))
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1])
    expect(cueTime(e, CUES.IMPACT)).toBeCloseTo(sceneTime(e, 'impact'), 10)
  })

  it('is edited with cuts: every shot is a named cut, many of them', () => {
    const e = make()
    expect(e.shots.length).toBeGreaterThanOrEqual(24)
    expect(e.shots.every((s) => s.name !== 'CUSTOM')).toBe(true)
    expect(e.cues.filter((c) => c.name === CUES.CAMERA_CUT)).toHaveLength(e.shots.length)
  })

  it('never drives one property with two overlapping tweens (pops / non-determinism)', () => {
    expect(make().overlaps()).toEqual([])
    expect(make(REDUCED_MOTION).overlaps()).toEqual([])
    expect(make(FULL_MOTION, 'portrait').overlaps()).toEqual([])
  })
})

describe('INTRO — determinism and scene jumps', () => {
  for (const t of [1.2, 3.7, 5.9, 8.8, 10.3, 12.6, 13.6, 16.0]) {
    it(`fixed-step playback equals seeking at t=${t}`, () => {
      const a = make()
      playRange(a, Math.max(0, t - 2), t)
      const b = make()
      b.seek(a.time)
      expect(snapshotState(b.state)).toEqual(snapshotState(a.state))
    })
  }

  it('jumping to a scene is the same as seeking to its time, from anywhere', () => {
    for (const id of SCENES) {
      const a = make()
      a.seek(17)
      expect(a.seekScene(id)).toBe(true)
      const b = make()
      b.seek(sceneTime(b, id))
      expect(snapshotState(a.state)).toEqual(snapshotState(b.state))
      expect(a.scene?.id).toBe(id)
    }
    expect(make().seekScene('no-such-scene')).toBe(false)
  })

  it('reports the live shot for any time', () => {
    const e = make()
    for (const s of e.shots) {
      e.seek(s.time + 0.001)
      expect(e.shot?.name).toBe(s.name)
    }
  })

  it('replay restores the initial frame', () => {
    const e = make()
    const initial = snapshotState(e.state)
    e.seek(14)
    e.replay()
    expect(snapshotState(e.state)).toEqual(initial)
    expect(e.state.impact.age).toBe(-1)
    expect(e.state.anchor.visible).toBe(0)
  })

  it('fires every cue exactly once, in order, during playback', () => {
    const e = make()
    const seen: string[] = []
    e.on('cue', (c) => seen.push(c.name))
    playRange(e, 0, e.duration)
    expect(e.isComplete).toBe(true)
    expect(seen).toEqual(e.cues.map((c) => c.name))
  })

  it('suppresses cues while seeking, skipping or jumping scenes', () => {
    const e = make()
    let fired = 0
    e.on('cue', () => fired++)
    e.seek(9)
    e.seekScene('impact')
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

  it('slow motion scales the sequence clock', () => {
    const e = make()
    e.setTimeScale(0.25)
    e.fixedDelta = 1 / 60
    for (let i = 0; i < 60; i++) e.update(0)
    expect(e.time).toBeCloseTo(0.25, 6)
  })

  it('clamps large frame gaps so choreography cannot be skipped by a stall', () => {
    const e = make()
    e.update(5)
    expect(e.time).toBeCloseTo(MAX_FRAME_DT, 10)
  })
})

describe('INTRO — choreography', () => {
  it('arrival: NOX is already there; AERON reconstructs', () => {
    const e = make()
    e.seek(0.1)
    expect(e.state.fighters.void.reveal).toBe(1)
    expect(e.state.fighters.velocity.reveal).toBeLessThan(0.1)
    e.seek(sceneTime(e, 'standoff'))
    expect(e.state.fighters.velocity.reveal).toBeCloseTo(1, 3)
  })

  it('the first attack is explosive and NOX phases only at contact', () => {
    const e = make()
    const t0 = sceneTime(e, 'first-attack')
    let peak = 0
    let phaseBeforeContact = 0
    playRange(e, t0, t0 + 0.6, (x) => {
      peak = Math.max(peak, x.derived.velocitySpeed)
      if (x.time < cueTime(x, CUES.VOID_PHASE) - 0.04) phaseBeforeContact = Math.max(phaseBeforeContact, x.state.fighters.void.phase)
    })
    expect(peak).toBeGreaterThan(8)
    expect(phaseBeforeContact).toBeLessThan(0.05)
  })

  it('teleport: fragments, an empty frame, reconstruction behind NOX', () => {
    const e = make()
    const t = sceneTime(e, 'teleport')
    e.seek(t + 0.2)
    expect(e.state.fighters.velocity.reveal).toBeLessThan(0.05)
    e.seek(t + 0.24) // the empty frame
    expect(e.state.fighters.velocity.reveal).toBeLessThan(0.05)
    e.seek(sceneTime(e, 'reversal'))
    const v = e.state.fighters.velocity
    expect(v.reveal).toBeGreaterThan(0.9)
    expect(v.position.x).toBeGreaterThan(e.state.fighters.void.position.x) // behind NOX
    expect(v.position.y).toBeGreaterThan(0.5) // above
  })

  it('the Code Core charges in under a second and is spent at the impact', () => {
    const e = make()
    const t = sceneTime(e, 'core')
    e.seek(t + 0.75)
    expect(e.state.core.charge).toBeGreaterThan(0.95)
    e.seek(sceneTime(e, 'impact') + 0.1)
    expect(e.state.core.charge).toBe(0)
  })

  it('impact → explosion → aftermath', () => {
    const e = make()
    const t0 = sceneTime(e, 'impact')
    e.seek(t0 + 0.05)
    expect(e.state.impact.light).toBe(0) // bodies readable first
    e.seek(t0 + 0.2)
    expect(e.state.impact.light).toBeGreaterThan(0.9)
    e.seek(t0 + 1.0)
    expect(e.state.impact.shock).toBeGreaterThan(0.5)
    expect(e.state.impact.crater).toBeGreaterThan(0.9)
    e.skip()
    expect(e.state.fighters.void.pose).toBe('collapse')
    expect(e.state.fighters.velocity.pose).toBe('recover')
    expect(e.state.fighters.velocity.position.distanceTo(MARKS.aeronLanding)).toBeLessThan(1e-6)
    expect(e.state.fx.exposure).toBeLessThan(0.5)
  })
})

describe('INTRO — reduced motion and layout', () => {
  it('reduced motion: no shake, impact frames or speed lines; softened flashes; nothing moves fast', () => {
    const e = make(REDUCED_MOTION)
    expect(e.cues.some((c) => c.name === CUES.CAMERA_SHAKE)).toBe(false)
    let invert = 0
    let speed = 0
    let flash = 0
    let peak = 0
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
    playRange(e, 0, 7)
    const progress = e.time / e.duration
    e.setMotion(REDUCED_MOTION)
    expect(e.time / e.duration).toBeCloseTo(progress, 6)
    const fresh = make(REDUCED_MOTION)
    fresh.seek(e.time)
    expect(snapshotState(e.state)).toEqual(snapshotState(fresh.state))
  })

  it('portrait recomposes only the camera: the choreography is identical', () => {
    for (const t of [4, 9, 12.5, 15]) {
      const land = make()
      const port = make(FULL_MOTION, 'portrait')
      land.seek(t)
      port.seek(t)
      const a = snapshotState(land.state) as Record<string, unknown>
      const b = snapshotState(port.state) as Record<string, unknown>
      expect(b.fighters).toEqual(a.fighters)
      expect(b.impact).toEqual(a.impact)
    }
  })
})
