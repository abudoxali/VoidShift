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
import { CinematicGradeEffect } from './CinematicGradeEffect'

const BLOOM_INTENSITY = 0.85

/**
 * Restrained post pipeline — 2 effect passes (+ bloom's mip chain):
 *   pass 1  SpatialDistortion (VOID lens, corruption band, shockwave)
 *   pass 2  Bloom → ACES tone mapping → CinematicGrade (gate, vignette, flash, grain)
 */
export function PostPipeline() {
  const engine = useCinematicEngine()
  const { profile } = useWorld()
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
      grade: { gate: 0, aspect: 1, flash: 0, exposure: 1, grain: true },
    }),
    [],
  )

  useEffect(() => {
    const offCue = engine.on('cue', (cue, e) => {
      if (cue.name === CUES.VOID_OPEN) scratch.shockBirth = e.elapsed - (e.time - cue.time)
    })
    const offSeek = engine.on('seek', () => (scratch.shockBirth = -1))
    return () => {
      offCue()
      offSeek()
    }
  }, [engine, scratch])

  useFrame(() => {
    const s = engine.state
    const lens = scratch.lens

    // Project the void into screen space; radius from its world size at its depth.
    scratch.view.copy(s.void.position).applyMatrix4(camera.matrixWorldInverse)
    const depth = -scratch.view.z
    lens.onScreen = depth > camera.near
    scratch.ndc.copy(s.void.position).project(camera)
    lens.center.set(scratch.ndc.x * 0.5 + 0.5, scratch.ndc.y * 0.5 + 0.5)
    const tanHalf = Math.tan(MathUtils.degToRad(camera.fov) / 2)
    lens.horizon = depth > 0 ? s.void.radius / (2 * depth * tanHalf) : 0
    lens.mass = s.void.mass
    lens.reveal = s.void.reveal
    lens.corruption = s.void.corruption * engine.motion.ambient
    distortion.setLens(lens, engine.elapsed)
    // Attack line in screen space: project the core and a point one unit along the axis.
    const aspect = size.width / Math.max(size.height, 1)
    const cx = scratch.ndc.x
    const cy = scratch.ndc.y
    scratch.probe.copy(s.void.position).add(scratch.attackAxis.subVectors(s.attack.to, s.attack.from).normalize()).project(camera)
    scratch.axis2d.set((scratch.probe.x - cx) * aspect, scratch.probe.y - cy)
    if (scratch.axis2d.lengthSq() < 1e-10) scratch.axis2d.set(1, 0)
    scratch.axis2d.normalize()
    scratch.split2d.set(-scratch.axis2d.y, scratch.axis2d.x)
    distortion.setPhase(s.void.phase, s.void.fold, s.void.desync, scratch.axis2d, scratch.split2d)
    distortion.setShock(lens.center.x, lens.center.y, scratch.shockBirth < 0 ? -1 : engine.elapsed - scratch.shockBirth, -0.9 * engine.motion.flash)

    bloom.intensity = BLOOM_INTENSITY * s.fx.bloom
    const g = scratch.grade
    g.gate = s.fx.gate
    g.aspect = size.width / Math.max(size.height, 1)
    g.flash = s.fx.flash
    g.exposure = s.fx.exposure
    g.grain = profile.grain
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
