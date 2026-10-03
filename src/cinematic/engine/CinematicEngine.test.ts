import { describe, expect, it } from 'vitest'
import { FOUNDATION_SEQUENCE } from '../sequences/foundation'
import { FULL_MOTION, REDUCED_MOTION, type CinematicPhase } from '../types'
import { CinematicEngine, MAX_FRAME_DT } from './CinematicEngine'
import { VELOCITY_HOME, snapshotState } from './CinematicState'
import { CUES } from './cues'
import type { CueEvent } from './CinematicTimeline'

const make = (motion = FULL_MOTION) => new CinematicEngine({ sequence: FOUNDATION_SEQUENCE, motion })

function play(engine: CinematicEngine, seconds: number, dt = 1 / 60) {
  const steps = Math.round(seconds / dt)
  for (let i = 0; i < steps; i++) engine.update(dt)
}

describe('CinematicEngine — foundation sequence', () => {
  it('lays phases out contiguously in narrative order', () => {
    const engine = make()
    const phases = engine.phases
    expect(phases.map((p) => p.phase)).toEqual(['BOOT', 'REVEAL', 'SPAWN'])
    expect(phases[0].start).toBe(0)
    for (let i = 1; i < phases.length; i++) expect(phases[i].start).toBeCloseTo(phases[i - 1].end, 10)
    expect(engine.duration).toBeCloseTo(phases[phases.length - 1].end, 10)
  })

  it('is deterministic: playing to t equals seeking to t', () => {
    const a = make()
    play(a, 9.3)
    const b = make()
    b.seek(a.time)
    expect(snapshotState(b.state)).toEqual(snapshotState(a.state))
  })

  it('produces identical state after seeking backwards and forwards again', () => {
    const engine = make()
    engine.seek(12)
    const first = snapshotState(engine.state)
    engine.seek(1)
    engine.seek(15)
    engine.seek(12)
    expect(snapshotState(engine.state)).toEqual(first)
  })

  it('replay restores the initial frame', () => {
    const engine = make()
    const initial = snapshotState(engine.state)
    play(engine, 10)
    engine.replay()
    expect(engine.time).toBe(0)
    expect(snapshotState(engine.state)).toEqual(initial)
  })

  it('fires every cue exactly once, in order, during playback', () => {
    const engine = make()
    const fired: CueEvent[] = []
    engine.on('cue', (cue) => fired.push(cue))
    play(engine, engine.duration + 1)
    expect(fired.map((c) => c.name)).toEqual(engine.cues.map((c) => c.name))
    for (let i = 1; i < fired.length; i++) expect(fired[i].time).toBeGreaterThanOrEqual(fired[i - 1].time)
  })

  it('does not fire cues when seeking or skipping', () => {
    const engine = make()
    let count = 0
    engine.on('cue', () => count++)
    engine.seek(10)
    engine.skip()
    expect(count).toBe(0)
  })

  it('emits phase changes in order', () => {
    const engine = make()
    const seen: CinematicPhase[] = []
    engine.on('phase', (p) => seen.push(p))
    play(engine, engine.duration + 0.5)
    expect(seen).toEqual(['REVEAL', 'SPAWN'])
  })

  it('clamps large frame gaps so choreography cannot be skipped by a stall', () => {
    const engine = make()
    engine.update(5)
    expect(engine.time).toBeCloseTo(MAX_FRAME_DT, 10)
  })

  it('skip lands on the held final frame with both entities present', () => {
    const engine = make()
    let completed = 0
    engine.on('complete', () => completed++)
    engine.skip()
    expect(engine.isComplete).toBe(true)
    expect(completed).toBe(1)
    expect(engine.phase).toBe('SPAWN')
    expect(engine.state.velocity.position.distanceTo(VELOCITY_HOME)).toBeLessThan(1e-6)
    expect(engine.state.velocity.assemble).toBeCloseTo(1)
    expect(engine.state.void.mass).toBeCloseTo(1)
    expect(engine.state.void.reveal).toBeCloseTo(1)
    expect(engine.state.camera.mode).toBe('ORBIT')
  })

  it('keeps the world clock running after the sequence completes', () => {
    const engine = make()
    engine.skip()
    const before = engine.elapsed
    play(engine, 1)
    expect(engine.time).toBe(engine.duration)
    expect(engine.elapsed).toBeGreaterThan(before + 0.9)
  })

  it('fixedDelta makes playback independent of real frame time', () => {
    const engine = make()
    engine.fixedDelta = 1 / 60
    engine.update(0.5)
    engine.update(0.001)
    expect(engine.time).toBeCloseTo(2 / 60, 10)
  })

  it('pausing freezes both clocks', () => {
    const engine = make()
    play(engine, 1)
    engine.pause()
    const t = engine.time
    const e = engine.elapsed
    play(engine, 1)
    expect(engine.time).toBe(t)
    expect(engine.elapsed).toBe(e)
  })

  it('derives VELOCITY motion from the choreography (the dash is extremely fast)', () => {
    const engine = make()
    const dashStart = engine.cues.find((c) => c.name === CUES.VELOCITY_DASH)!.time
    engine.seek(dashStart)
    let peak = 0
    for (let i = 0; i < 20; i++) {
      engine.update(1 / 60)
      peak = Math.max(peak, engine.derived.velocitySpeed)
    }
    expect(peak).toBeGreaterThan(40)
    play(engine, 2)
    expect(engine.derived.velocitySpeed).toBeLessThan(0.5)
  })
})

describe('CinematicEngine — reduced motion', () => {
  it('removes shake cues and the dash, and flattens flashes', () => {
    const engine = make(REDUCED_MOTION)
    expect(engine.cues.some((c) => c.name === CUES.CAMERA_SHAKE)).toBe(false)
    expect(engine.cues.some((c) => c.name === CUES.VELOCITY_DASH)).toBe(false)
    let peakFlash = 0
    let peakSpeed = 0
    for (let t = 0; t < engine.duration; t += 1 / 60) {
      engine.update(1 / 60)
      peakFlash = Math.max(peakFlash, engine.state.fx.flash)
      peakSpeed = Math.max(peakSpeed, engine.derived.velocitySpeed)
    }
    expect(peakFlash).toBe(0)
    expect(peakSpeed).toBeLessThan(1)
  })

  it('switching profiles mid-sequence preserves progress and stays deterministic', () => {
    const engine = make()
    play(engine, 8)
    const progress = engine.time / engine.duration
    engine.setMotion(REDUCED_MOTION)
    expect(engine.time / engine.duration).toBeCloseTo(progress, 6)
    const fresh = make(REDUCED_MOTION)
    fresh.seek(engine.time)
    expect(snapshotState(engine.state)).toEqual(snapshotState(fresh.state))
  })

  it('reaches the same final composition as full motion (only handheld drift is softened)', () => {
    const full = make()
    const reduced = make(REDUCED_MOTION)
    full.skip()
    reduced.skip()
    expect(reduced.state.camera.breathe).toBeLessThan(full.state.camera.breathe)
    reduced.state.camera.breathe = full.state.camera.breathe
    expect(snapshotState(reduced.state)).toEqual(snapshotState(full.state))
  })
})
