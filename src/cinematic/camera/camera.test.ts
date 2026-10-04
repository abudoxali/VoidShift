import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { createCinematicState } from '../engine/CinematicState'
import { CameraRig } from './CameraRig'
import { DESIGN_ASPECT, MAX_ADAPTED_FOV, computeFraming } from './framing'

const hFov = (vFovDeg: number, aspect: number) =>
  2 * Math.atan(Math.tan((vFovDeg * Math.PI) / 360) * aspect)

describe('computeFraming', () => {
  it('leaves design-aspect and wider viewports untouched', () => {
    expect(computeFraming(DESIGN_ASPECT, 35)).toEqual({ fov: 35, distance: 1 })
    expect(computeFraming(21 / 9, 35)).toEqual({ fov: 35, distance: 1 })
  })

  it('preserves horizontal coverage on 4:3 by widening the FOV', () => {
    const f = computeFraming(4 / 3, 35)
    expect(f.distance).toBe(1)
    expect(f.fov).toBeGreaterThan(35)
    expect(hFov(f.fov, 4 / 3)).toBeGreaterThan(hFov(35, DESIGN_ASPECT) * 0.9)
  })

  it('dollies out on tall portrait screens instead of exceeding the FOV ceiling', () => {
    const f = computeFraming(390 / 844, 35)
    expect(f.fov).toBeLessThanOrEqual(MAX_ADAPTED_FOV)
    expect(f.distance).toBeGreaterThan(1)
    // Effective horizontal coverage: tan(h/2) * distance (relative to the subject plane).
    const coverage = Math.tan(hFov(f.fov, 390 / 844) / 2) * f.distance
    const design = Math.tan(hFov(35, DESIGN_ASPECT) / 2)
    expect(coverage / design).toBeGreaterThan(0.8)
  })
})

describe('CameraRig', () => {
  const origin = new Vector3()
  const resolve = () => origin

  it('lands exactly on the shot when first updated (no swoop from the origin)', () => {
    const rig = new CameraRig()
    const cam = createCinematicState().camera
    cam.mode = 'ESTABLISH'
    cam.lag = 2
    cam.position.set(4, 3, 10)
    rig.update(cam, resolve, DESIGN_ASPECT, 0, 1 / 60)
    expect(rig.position.toArray()).toEqual([4, 3, 10])
  })

  it('damps toward a moved target and converges', () => {
    const rig = new CameraRig()
    const cam = createCinematicState().camera
    cam.mode = 'ESTABLISH'
    cam.lag = 3
    cam.position.set(0, 0, 10)
    rig.update(cam, resolve, DESIGN_ASPECT, 0, 1 / 60)
    cam.position.set(10, 0, 10)
    rig.update(cam, resolve, DESIGN_ASPECT, 0, 1 / 60)
    expect(rig.position.x).toBeGreaterThan(0)
    expect(rig.position.x).toBeLessThan(1)
    for (let i = 0; i < 600; i++) rig.update(cam, resolve, DESIGN_ASPECT, 0, 1 / 60)
    expect(rig.position.x).toBeCloseTo(10, 3)
  })

  it('shake decays to zero and is disabled by a zero shake scale', () => {
    const rig = new CameraRig()
    const cam = createCinematicState().camera
    rig.addShake(0.8)
    expect(rig.trauma).toBeCloseTo(0.8)
    for (let i = 0; i < 240; i++) rig.update(cam, resolve, DESIGN_ASPECT, i / 60, 1 / 60)
    expect(rig.trauma).toBe(0)

    const calm = new CameraRig()
    calm.shakeScale = 0
    calm.addShake(1)
    expect(calm.trauma).toBe(0)
  })

  it('applies FOV and look-at to a three.js camera', () => {
    const rig = new CameraRig()
    const cam = createCinematicState().camera
    cam.position.set(0, 0, 10)
    cam.target.set(0, 0, 0)
    cam.fov = 40
    rig.update(cam, resolve, DESIGN_ASPECT, 0, 1 / 60)
    const camera = new PerspectiveCamera()
    rig.apply(camera)
    expect(camera.fov).toBeCloseTo(40)
    const dir = new Vector3()
    camera.getWorldDirection(dir)
    expect(dir.z).toBeCloseTo(-1)
  })

  it('portrait-authored shots (fit = 0) keep their FOV on narrow screens', () => {
    const rig = new CameraRig()
    const cam = createCinematicState().camera
    cam.position.set(0, 0, 10)
    cam.fov = 46
    cam.fit = 0
    rig.update(cam, resolve, 390 / 844, 0, 1 / 60)
    expect(rig.fov).toBeCloseTo(46)
    cam.fit = 1
    const fitted = new CameraRig()
    fitted.update(cam, resolve, 390 / 844, 0, 1 / 60)
    expect(fitted.fov).toBeGreaterThan(46)
  })

  it('CHASE follows the tracked entity and leads along its motion', () => {
    const rig = new CameraRig()
    const cam = createCinematicState().camera
    const subject = new Vector3(5, 1, 0)
    cam.mode = 'CHASE'
    cam.track = 'velocity'
    cam.trackWeight = 1
    cam.position.set(-2, 0.5, 1)
    cam.lead = 2
    rig.update(cam, () => subject, DESIGN_ASPECT, 0, 1 / 60, new Vector3(60, 0, 0))
    expect(rig.position.toArray()).toEqual([3, 1.5, 1])
    expect(rig.target.x).toBeCloseTo(7, 5)
    const still = new CameraRig()
    still.update(cam, () => subject, DESIGN_ASPECT, 0, 1 / 60, new Vector3())
    expect(still.target.x).toBeCloseTo(5, 5)
  })
})
