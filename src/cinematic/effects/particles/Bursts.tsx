import { useEffect, useMemo } from 'react'
import { AdditiveBlending, LineSegments, ShaderMaterial, Sphere, Vector3, Vector4 } from 'three'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { CUES } from '../../engine/cues'
import { useWorld } from '../../scenes/WorldContext'
import { GLSL } from '../../shaders'
import { buildParticleGeometry, setParticleCount } from './particleGeometry'
import burstVert from './burst.vert.glsl?raw'
import burstFrag from './burst.frag.glsl?raw'

const SLOTS = 8
const PER_SLOT = 220

/**
 * Pooled one-shot particle bursts (sparks, dust, teleport implosion, reconstruction, VOID
 * shards). One draw call of streak segments; each cue claims the next slot, and every particle
 * is a pure function of (seed, age) in the vertex shader.
 */
export function Bursts() {
  const engine = useCinematicEngine()
  const { uniforms: world, profile } = useWorld()

  const geometry = useMemo(
    () =>
      buildParticleGeometry({
        capacity: SLOTS * PER_SLOT,
        seed: 913,
        verticesPerParticle: 2,
        attributes: { aSlot: 1, aSeed: 4, aDir: 3 },
        bounds: new Sphere(new Vector3(0, 2, 0), 40),
        init(w, i, rng) {
          w.set('aSlot', Math.floor(i / PER_SLOT))
          w.set('aSeed', rng(), rng(), rng(), rng())
          // Uniform direction on the sphere.
          const z = rng() * 2 - 1
          const a = rng() * Math.PI * 2
          const r = Math.sqrt(1 - z * z)
          w.set('aDir', r * Math.cos(a), z, r * Math.sin(a))
        },
      }),
    [],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: world.uTime,
          uBurst: { value: Array.from({ length: SLOTS }, () => new Vector4(0, 0, 0, -100)) },
          uBurstB: { value: Array.from({ length: SLOTS }, () => new Vector4()) },
          uDensity: { value: 1 },
        },
        vertexShader: GLSL.common + burstVert,
        fragmentShader: burstFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [world],
  )
  useEffect(() => () => material.dispose(), [material])

  const lines = useMemo(() => {
    const l = new LineSegments(geometry, material)
    l.frustumCulled = false
    l.renderOrder = 6
    return l
  }, [geometry, material])

  useEffect(() => {
    const a = material.uniforms.uBurst.value as Vector4[]
    const b = material.uniforms.uBurstB.value as Vector4[]
    let slot = 0
    const offCue = engine.on('cue', (cue, e) => {
      if (cue.name !== CUES.BURST) return
      const birth = e.elapsed - (e.time - cue.time)
      a[slot].set(cue.data.x ?? 0, cue.data.y ?? 0, cue.data.z ?? 0, birth)
      b[slot].set(cue.data.kind ?? 0, cue.data.scale ?? 1, e.motion.ambient, 0)
      slot = (slot + 1) % SLOTS
    })
    const offSeek = engine.on('seek', () => a.forEach((v) => v.setW(-100)))
    return () => {
      offCue()
      offSeek()
    }
  }, [engine, material])

  useEffect(() => {
    // LITE draws a uniform prefix of every slot's particles via the density threshold.
    material.uniforms.uDensity.value = profile.tier === 'LITE' ? 0.5 : 1
    setParticleCount(geometry, SLOTS * PER_SLOT)
  }, [geometry, material, profile.tier])

  return <primitive name="bursts" object={lines} />
}
