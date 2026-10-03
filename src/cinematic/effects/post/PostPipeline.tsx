import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { BloomEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo } from 'react'
import { HalfFloatType, MathUtils, Vector2, Vector3, type PerspectiveCamera } from 'three'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { CUES } from '../../engine/cues'
import { FRAME_STAGE } from '../../engine/frameStages'
import { useWorld } from '../../scenes/WorldContext'
import { SpatialDistortionEffect, type LensParams } from '../distortion/SpatialDistortionEffect'
import { CinematicGradeEffect, type GradeParams } from './CinematicGradeEffect'

const BLOOM_INTENSITY = 0.85

/**
 * Restrained post pipeline — 2 effect passes (+ bloom's mip chain):
 *   pass 1  SpatialDistortion (VOID lens, corruption band, shockwave)
 *   pass 2  Bloom → ACES tone mapping → CinematicGrade (gate, vignette, flash, grain)
 */
export function PostPipeline() {
  const engine = useCinematicEngine()
  const { profile, uniforms: world } = useWorld()
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)

  const distortion = useMemo(() => new SpatialDistortionEffect(), [])
  const grade = useMemo(() => new CinematicGradeEffect(), [])
  const tone = useMemo(() => new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), [])
  const bloom = useMemo(
    () =>
      new BloomEffect({
        mipmapBlur: true,
        levels: profile.bloom.levels,
        luminanceThreshold: 0.92,
        luminanceSmoothing: 0.3,
        intensity: BLOOM_INTENSITY,
        radius: 0.7,
      }),
    [profile.bloom.levels],
  )
  useEffect(() => () => bloom.dispose(), [bloom])
  useEffect(
    () => () => {
      distortion.dispose()
      grade.dispose()
      tone.dispose()
    },
    [distortion, grade, tone],
  )
  useEffect(() => distortion.setChroma(profile.lensChroma), [distortion, profile.lensChroma])

  const scratch = useMemo(
    () => ({
      ndc: new Vector3(),
      view: new Vector3(),
      probe: new Vector3(),
      attackAxis: new Vector3(),
      axis2d: new Vector2(1, 0),
      split2d: new Vector2(0, 1),
      lens: { center: new Vector2(), horizon: 0, mass: 0, reveal: 0, corruption: 0, onScreen: false } as LensParams,
      shockBirth: -1,
      shockStrength: 0,
      shockOrigin: new Vector3(),
      shock2d: new Vector2(),
      grade: { gate: 0, aspect: 1, flash: 0, exposure: 1, grain: true, invert: 0, speed: 0, speedAngle: 0, radial: 0, radialCenter: new Vector2(0.5, 0.5) } as GradeParams,
    }),
    [],
  )

  useEffect(() => {
    const offCue = engine.on('cue', (cue, e) => {
      const birth = e.elapsed - (e.time - cue.time)
      if (cue.name === CUES.IMPACT) {
        scratch.shockBirth = birth
        scratch.shockOrigin.set(cue.data.x ?? 0, cue.data.y ?? 0, cue.data.z ?? 0)
        scratch.shockStrength = 1.4
      } else if (cue.name === CUES.VOID_OPEN) {
        scratch.shockBirth = birth
        scratch.shockOrigin.copy(world.uVoidPos.value)
        scratch.shockStrength = -0.7
      }
    })
    const offSeek = engine.on('seek', () => (scratch.shockBirth = -1))
    return () => {
      offCue()
      offSeek()
    }
  }, [engine, scratch, world])

  const toScreen = (p: Vector3, out: Vector2): boolean => {
    scratch.view.copy(p).applyMatrix4(camera.matrixWorldInverse)
    scratch.ndc.copy(p).project(camera)
    out.set(scratch.ndc.x * 0.5 + 0.5, scratch.ndc.y * 0.5 + 0.5)
    return -scratch.view.z > camera.near
  }

  useFrame(() => {
    const s = engine.state
    const lens = scratch.lens
    const fx = s.fx
    const vd = s.fighters.void

    // VOID's local field: no lens (it read as a portal) — only a corruption shimmer and the
    // chromatic desync while it phases.
    lens.onScreen = toScreen(world.uVoidPos.value, lens.center)
    const depth = -scratch.view.z
    const tanHalf = Math.tan(MathUtils.degToRad(camera.fov) / 2)
    lens.horizon = depth > 0 ? 0.55 / (2 * depth * tanHalf) : 0
    lens.mass = 0
    lens.reveal = 0
    lens.corruption = fx.lens * 0.35 * vd.reveal * engine.motion.ambient
    distortion.setLens(lens, engine.elapsed)
    distortion.setPhase(0, 0, vd.phase * fx.lens * 0.9, scratch.axis2d, scratch.split2d)

    // Shockwave ring (impact / tear).
    const age = scratch.shockBirth < 0 ? -1 : engine.elapsed - scratch.shockBirth
    toScreen(scratch.shockOrigin, scratch.shock2d)
    distortion.setShock(scratch.shock2d.x, scratch.shock2d.y, age, scratch.shockStrength * engine.motion.flash)

    bloom.intensity = BLOOM_INTENSITY * fx.bloom
    const g = scratch.grade
    g.gate = fx.gate
    g.aspect = size.width / Math.max(size.height, 1)
    g.flash = fx.flash
    g.exposure = fx.exposure
    g.grain = profile.grain
    g.invert = fx.invert
    g.speed = fx.speed
    g.speedAngle = fx.speedAngle
    g.radial = fx.radial
    toScreen(s.impact.position, g.radialCenter)
    grade.set(g, engine.elapsed)
  }, FRAME_STAGE.LATE)

  return (
    <EffectComposer multisampling={profile.msaa} frameBufferType={HalfFloatType} enableNormalPass={false}>
      <primitive object={distortion} dispose={null} />
      {profile.bloom.enabled ? <primitive object={bloom} dispose={null} /> : <></>}
      <primitive object={tone} dispose={null} />
      <primitive object={grade} dispose={null} />
    </EffectComposer>
  )
}
