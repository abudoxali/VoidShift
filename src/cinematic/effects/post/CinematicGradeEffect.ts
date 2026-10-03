import { Effect } from 'postprocessing'
import { Uniform, Vector2 } from 'three'
import { GLSL } from '../../shaders'
import fragment from './cinematicGrade.frag.glsl?raw'
import { smoothstep } from '../../../utils/math'

/** Target cinematic aspect of the letterbox gate on landscape screens. */
const GATE_ASPECT = 2.2

/** Bar height for a viewport: letterbox on landscape, none on portrait (no wasted pixels). */
export function letterboxFor(aspect: number): number {
  if (aspect >= GATE_ASPECT) return 0
  return Math.max(0, (1 - aspect / GATE_ASPECT) / 2) * smoothstep(1.05, 1.4, aspect)
}

export interface GradeParams {
  gate: number
  aspect: number
  flash: number
  exposure: number
  grain: boolean
  /** 0..1 inverted graphic impact frame. */
  invert: number
  /** 0..1 directional speed lines along `speedAngle` (screen radians). */
  speed: number
  speedAngle: number
  /** 0..1 radial burst rays from `radialCenter` (uv). */
  radial: number
  radialCenter: Vector2
}

/**
 * Final grade + 2D motion-graphics layer, merged into the bloom/tone-mapping pass (no convolution,
 * no extra render pass): gate, vignette, flash, grain, speed lines, radial burst rays and
 * inverted impact frames.
 */
export class CinematicGradeEffect extends Effect {
  constructor() {
    super('CinematicGradeEffect', GLSL.common + fragment, {
      uniforms: new Map<string, Uniform>([
        ['uGate', new Uniform(0)],
        ['uLetterbox', new Uniform(0)],
        ['uFlash', new Uniform(0)],
        ['uExposure', new Uniform(1)],
        ['uVignette', new Uniform(0.42)],
        ['uGrain', new Uniform(1)],
        ['uClock', new Uniform(0)],
        ['uInvert', new Uniform(0)],
        ['uSpeed', new Uniform(0)],
        ['uSpeedAngle', new Uniform(0)],
        ['uRadial', new Uniform(0)],
        ['uRadialCenter', new Uniform(new Vector2(0.5, 0.5))],
      ]),
    })
  }

  set(p: GradeParams, clock: number): void {
    const u = this.uniforms
    u.get('uGate')!.value = p.gate
    u.get('uLetterbox')!.value = letterboxFor(p.aspect)
    u.get('uFlash')!.value = p.flash
    u.get('uExposure')!.value = p.exposure
    u.get('uGrain')!.value = p.grain ? 1 : 0
    u.get('uClock')!.value = clock
    u.get('uInvert')!.value = p.invert
    u.get('uSpeed')!.value = p.speed
    u.get('uSpeedAngle')!.value = p.speedAngle
    u.get('uRadial')!.value = p.radial
    ;(u.get('uRadialCenter')!.value as Vector2).copy(p.radialCenter)
  }
}
