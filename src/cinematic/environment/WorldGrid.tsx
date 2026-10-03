import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { PlaneGeometry, ShaderMaterial, Vector3, Vector4 } from 'three'
import { useCinematicEngine } from '../engine/CinematicContext'
import { CUES } from '../engine/cues'
import { FRAME_STAGE } from '../engine/frameStages'
import { useWorld } from '../scenes/WorldContext'
import { GLSL, fieldUniforms } from '../shaders'
import gridFrag from './grid.frag.glsl?raw'
import gridVert from './grid.vert.glsl?raw'
import { ENVIRONMENT_PALETTE as P } from './palette'

const GRID_SIZE = 180
const RIPPLE_SLOTS = 4

/**
 * The computational floor: a measurement lattice (points, dashed survey lines, ruler ticks,
 * origin axes) on a displaced plane. The VOID's gravity sinks and corrupts it; VELOCITY
 * energises it; cues send shockwaves through it.
 */
export function WorldGrid() {
  const engine = useCinematicEngine()
  const { uniforms: world, profile } = useWorld()

  const geometry = useMemo(() => {
    const g = new PlaneGeometry(GRID_SIZE, GRID_SIZE, profile.gridSegments, profile.gridSegments)
    g.rotateX(-Math.PI / 2)
    return g
  }, [profile.gridSegments])
  useEffect(() => () => geometry.dispose(), [geometry])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          ...fieldUniforms(world),
          uRipples: { value: Array.from({ length: RIPPLE_SLOTS }, () => new Vector4()) },
          uReveal: { value: 0 },
          uAxis: { value: 0 },
          uGround: { value: P.ground },
          uLine: { value: P.line },
          uAxisColor: { value: P.axis },
          uAccent: { value: P.accent },
          uVoidTint: { value: P.voidTint },
          uHorizon: { value: new Vector3(...P.horizon) },
          uFogNear: { value: 9 },
          uFogFar: { value: 60 },
        },
        vertexShader: GLSL.common + GLSL.field + gridVert,
        fragmentShader: GLSL.common + GLSL.field + gridFrag,
      }),
    [world],
  )
  useEffect(() => () => material.dispose(), [material])

  useEffect(() => {
    const ripples = material.uniforms.uRipples.value as Vector4[]
    let slot = 0
    const offCue = engine.on('cue', (cue, e) => {
      if (cue.name !== CUES.GRID_RIPPLE) return
      // Birth in world-clock time, compensating for how far the playhead overshot the cue.
      const birth = e.elapsed - (e.time - cue.time)
      ripples[slot].set(cue.data.x ?? 0, cue.data.z ?? 0, birth, (cue.data.strength ?? 1) * Math.max(e.motion.ambient, 0.5))
      slot = (slot + 1) % RIPPLE_SLOTS
    })
    const offSeek = engine.on('seek', () => ripples.forEach((r) => r.set(0, 0, 0, 0)))
    return () => {
      offCue()
      offSeek()
    }
  }, [engine, material])

  useFrame(() => {
    const u = material.uniforms
    u.uReveal.value = engine.state.world.reveal
    u.uAxis.value = engine.state.world.axis
    // Distance fades into the atmosphere, which itself fades in during BOOT/REVEAL.
    ;(u.uHorizon.value as Vector3).set(...P.horizon).multiplyScalar(engine.state.world.atmosphere)
  }, FRAME_STAGE.WORLD)

  return <mesh geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} dispose={null} />
}
