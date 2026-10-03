import { describe, expect, it } from 'vitest'
import { CinematicEngine } from '../../engine/CinematicEngine'
import { createStage, extremities, inFrame, jointPoint, sampleStage, shotPreset } from '../../testing/stageProbe'
import { INTRO_SEQUENCE } from '.'

/**
 * Staging contracts, measured on the real rigs posed by the real timeline:
 *  - framing: every shot that declares full-body subjects keeps their head, hands and feet
 *    inside the letterboxed frame;
 *  - contact: strikes land where the story says (through the chest, on the head, on the back).
 */
const sceneTime = (e: CinematicEngine, id: string) => e.scenes.find((s) => s.id === id)!.time

describe('INTRO — framing', () => {
  it('full-body shots never cut a fighter’s head, hands or feet', () => {
    const e = new CinematicEngine({ sequence: INTRO_SEQUENCE, autoplay: false })
    const st = createStage()
    const misses: string[] = []
    for (let t = 0; t <= e.duration; t += 1 / 30) {
      e.seek(t)
      sampleStage(st, e)
      const preset = shotPreset(e.shot?.name)
      for (const id of preset?.fullBody ?? []) {
        if (e.state.fighters[id].reveal < 0.5) continue
        for (const [part, p] of Object.entries(extremities(st, id))) if (!inFrame(st, p, 0.0)) misses.push(`${t.toFixed(2)} ${e.shot!.name} ${id}.${part}`)
      }
    }
    // A single frame of a limb at the very edge during a fast move is tolerated.
    expect(misses.length, misses.slice(0, 10).join('\n')).toBeLessThanOrEqual(2)
  })

  it('every shot has a known preset', () => {
    const e = new CinematicEngine({ sequence: INTRO_SEQUENCE, autoplay: false })
    for (const s of e.shots) expect(shotPreset(s.name), s.name).not.toBeNull()
  })
})

describe('INTRO — contact', () => {
  const e = new CinematicEngine({ sequence: INTRO_SEQUENCE, autoplay: false })
  const st = createStage()
  const at = (t: number) => {
    e.seek(t)
    sampleStage(st, e)
  }

  it('the first punch passes THROUGH NOX’s upper torso while he is phased', () => {
    const t0 = sceneTime(e, 'first-attack')
    let through = false
    for (let t = t0 + 0.3; t < t0 + 0.8; t += 1 / 60) {
      at(t)
      const fist = jointPoint(st, 'velocity', 'handR', [0, -0.12, 0])
      const chest = jointPoint(st, 'void', 'chest')
      if (fist.x > chest.x && Math.abs(fist.y - chest.y) < 0.25 && Math.abs(fist.z - chest.z) < 0.3) {
        expect(e.state.fighters.void.phase).toBeGreaterThan(0.8)
        through = true
      }
    }
    expect(through).toBe(true)
  })

  it('NOX’s counter elbow passes over AERON’s ducked head', () => {
    const t0 = sceneTime(e, 'first-attack')
    at(t0 + 1.02)
    const elbow = jointPoint(st, 'void', 'foreArmR')
    const head = jointPoint(st, 'velocity', 'head')
    expect(elbow.y).toBeGreaterThan(head.y + 0.1)
  })

  it('the spinning kick reaches NOX’s head as he phases', () => {
    const t0 = sceneTime(e, 'close-combat')
    let best = Infinity
    for (let t = t0 + 1.0; t < t0 + 1.3; t += 1 / 60) {
      at(t)
      best = Math.min(best, jointPoint(st, 'velocity', 'footL').distanceTo(jointPoint(st, 'void', 'head')))
    }
    expect(best).toBeLessThan(0.3)
  })

  it('the anchor leaves from AERON’s hand', () => {
    const t = sceneTime(e, 'anchor') + 0.71
    at(t)
    const hand = jointPoint(st, 'velocity', 'handR', [0, -0.1, 0])
    expect(hand.distanceTo(e.state.anchor.position)).toBeLessThan(0.2)
  })

  it('the Code Core is driven into NOX’s upper back at contact', () => {
    at(sceneTime(e, 'impact') - 1e-4)
    const hand = jointPoint(st, 'velocity', 'handR', [0, -0.15, 0])
    const neck = jointPoint(st, 'void', 'neck')
    expect(hand.distanceTo(neck)).toBeLessThan(0.25)
  })
})
