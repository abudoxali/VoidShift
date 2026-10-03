import { Effect, EffectAttribute } from 'postprocessing'
import { Uniform, Vector2, Vector4 } from 'three'
import { GLSL } from '../../shaders'
import fragment from './spatialDistortion.frag.glsl?raw'

export interface LensParams {
  center: Vector2
  horizon: number
  mass: number
  reveal: number
  corruption: number
  onScreen: boolean
}

/**
 * Screen-space spatial distortion (postprocessing Effect). Convolution-type: it re-samples
 * the input buffer, so it runs in its own pass before bloom (the lensed image is what blooms).
 */
export class SpatialDistortionEffect extends Effect {
  constructor() {
    super('SpatialDistortionEffect', GLSL.common + fragment, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uCenter', new Uniform(new Vector2(0.5, 0.5))],
        ['uHorizon', new Uniform(0.05)],
        ['uMass', new Uniform(0)],
        ['uReveal', new Uniform(0)],
        ['uCorruption', new Uniform(0)],
        ['uChroma', new Uniform(1)],
        ['uOnScreen', new Uniform(0)],
        ['uClock', new Uniform(0)],
        ['uShock', new Uniform(new Vector4(0.5, 0.5, 0, 0))],
      ]),
    })
  }

  private u(name: string): Uniform {
    return this.uniforms.get(name)!
  }

  setLens(p: LensParams, clock: number): void {
    ;(this.u('uCenter').value as Vector2).copy(p.center)
    this.u('uHorizon').value = p.horizon
    this.u('uMass').value = p.mass
    this.u('uReveal').value = p.reveal
    this.u('uCorruption').value = p.corruption
    this.u('uOnScreen').value = p.onScreen ? 1 : 0
    this.u('uClock').value = clock
  }

  setChroma(enabled: boolean): void {
    this.u('uChroma').value = enabled ? 1 : 0
  }

  /** age < 0 or strength 0 disables the ring. */
  setShock(centerX: number, centerY: number, age: number, strength: number): void {
    ;(this.u('uShock').value as Vector4).set(centerX, centerY, Math.max(age, 0), age < 0 ? 0 : strength)
  }
}
