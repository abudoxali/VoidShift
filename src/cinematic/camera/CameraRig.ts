import { Vector3, type PerspectiveCamera } from 'three'
import { damp, lerp, smoothstep } from '../../utils/math'
import type { CinematicState } from '../engine/CinematicState'
import { computeFraming, type Framing } from './framing'

const TRAUMA_DECAY = 1.9
const MAX_SHAKE_ANGLE = 0.032
const MAX_SHAKE_OFFSET = 0.05

/** Deterministic smooth pseudo-noise from layered incommensurate sines (no allocation, no RNG state). */
function wobble(t: number, seed: number): number {
  return (
    Math.sin(t * 1.0 + seed * 1.7) * 0.5 +
    Math.sin(t * 2.37 + seed * 3.1) * 0.3 +
    Math.sin(t * 5.71 + seed * 5.3) * 0.2
  )
}

/**
 * Interprets the choreographed camera state (from the timeline) into an actual camera
 * transform: mode behaviour, entity tracking, responsive framing, damping and shake.
 *
 * Pure class — the R3F component only feeds it time and applies the result.
 */
export class CameraRig {
  readonly position = new Vector3()
  readonly target = new Vector3()
  fov = 35
  roll = 0
  /** Accumulated shake energy (0..1); visual amplitude is trauma². */
  trauma = 0
  /** Global shake multiplier (motion profile). */
  shakeScale = 1

  private initialized = false
  private readonly desiredPos = new Vector3()
  private readonly desiredTarget = new Vector3()
  private readonly offset = new Vector3()
  private readonly framing: Framing = { fov: 35, distance: 1 }
  private readonly shakeOffset = new Vector3()
  private readonly shakeEuler = new Vector3()

  addShake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount * this.shakeScale)
  }

  /** Discard damping history so the next update lands exactly on the choreographed shot. */
  snap(): void {
    this.initialized = false
  }

  update(
    cam: CinematicState['camera'],
    resolveEntity: (id: CinematicState['camera']['track']) => Vector3,
    aspect: number,
    elapsed: number,
    dt: number,
    trackMotion?: Vector3,
  ): void {
    const tracked = resolveEntity(cam.track)

    // 1. Choreographed intention, interpreted by mode.
    this.desiredTarget.copy(cam.target).lerp(tracked, cam.trackWeight)
    // Directional lead: look ahead of a fast-moving subject (CHASE language).
    if (cam.lead > 0 && trackMotion) {
      const speed = trackMotion.length()
      if (speed > 1e-3) this.desiredTarget.addScaledVector(trackMotion, (cam.lead * smoothstep(2, 25, speed)) / speed)
    }
    if (cam.mode === 'CHASE') {
      this.desiredPos.copy(tracked).add(cam.position)
    } else {
      this.desiredPos.copy(cam.position)
    }
    if (cam.mode === 'ORBIT') {
      const angle = Math.sin(elapsed * 0.045) * 0.16
      this.offset.subVectors(this.desiredPos, this.desiredTarget)
      this.offset.applyAxisAngle(UP, angle)
      this.desiredPos.copy(this.desiredTarget).add(this.offset)
    }
    if (cam.breathe > 0 && cam.mode !== 'FREEZE') {
      const b = cam.breathe
      this.desiredPos.x += wobble(elapsed * 0.21, 1) * 0.11 * b
      this.desiredPos.y += wobble(elapsed * 0.17, 2) * 0.07 * b
      this.desiredPos.z += wobble(elapsed * 0.13, 3) * 0.09 * b
      this.desiredTarget.x += wobble(elapsed * 0.19, 4) * 0.035 * b
      this.desiredTarget.y += wobble(elapsed * 0.23, 5) * 0.025 * b
    }

    // 2. Responsive framing: keep horizontal coverage on narrow viewports. Shots authored
    //    for portrait set fit = 0 and are used as composed.
    computeFraming(aspect, cam.fov, this.framing)
    this.framing.fov = lerp(cam.fov, this.framing.fov, cam.fit)
    this.framing.distance = lerp(1, this.framing.distance, cam.fit)
    if (this.framing.distance !== 1) {
      this.offset.subVectors(this.desiredPos, this.desiredTarget).multiplyScalar(this.framing.distance)
      this.desiredPos.copy(this.desiredTarget).add(this.offset)
    }

    // 3. Damping (frame-rate independent). lag <= 0, FREEZE and IMPACT are hard.
    const hard = !this.initialized || cam.lag <= 0 || cam.mode === 'FREEZE' || cam.mode === 'IMPACT'
    if (hard) {
      this.position.copy(this.desiredPos)
      this.target.copy(this.desiredTarget)
      this.fov = this.framing.fov
      this.roll = cam.roll
      this.initialized = true
    } else {
      const k = cam.lag
      this.position.set(
        damp(this.position.x, this.desiredPos.x, k, dt),
        damp(this.position.y, this.desiredPos.y, k, dt),
        damp(this.position.z, this.desiredPos.z, k, dt),
      )
      this.target.set(
        damp(this.target.x, this.desiredTarget.x, k * 1.15, dt),
        damp(this.target.y, this.desiredTarget.y, k * 1.15, dt),
        damp(this.target.z, this.desiredTarget.z, k * 1.15, dt),
      )
      this.fov = damp(this.fov, this.framing.fov, k, dt)
      this.roll = damp(this.roll, cam.roll, k, dt)
    }

    // 4. Shake (trauma model): deterministic noise, quadratic response, exponential decay.
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY * dt * (0.35 + this.trauma))
    const s = this.trauma * this.trauma * (cam.mode === 'IMPACT' ? 1.6 : 1)
    const ft = elapsed * 22
    this.shakeEuler.set(wobble(ft, 11) * MAX_SHAKE_ANGLE * s, wobble(ft, 12) * MAX_SHAKE_ANGLE * s, wobble(ft, 13) * MAX_SHAKE_ANGLE * 0.6 * s)
    this.shakeOffset.set(wobble(ft, 14) * MAX_SHAKE_OFFSET * s, wobble(ft, 15) * MAX_SHAKE_OFFSET * s, 0)
  }

  /** Writes the rig result into a three.js camera. */
  apply(camera: PerspectiveCamera): void {
    camera.position.copy(this.position).add(this.shakeOffset)
    camera.up.set(0, 1, 0)
    camera.lookAt(this.target)
    camera.rotateZ(this.roll + this.shakeEuler.z)
    camera.rotateX(this.shakeEuler.x)
    camera.rotateY(this.shakeEuler.y)
    if (Math.abs(camera.fov - this.fov) > 1e-4) {
      camera.fov = this.fov
      camera.updateProjectionMatrix()
    }
  }
}

const UP = new Vector3(0, 1, 0)
