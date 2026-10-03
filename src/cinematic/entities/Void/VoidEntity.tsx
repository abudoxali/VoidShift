import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Sphere, Vector3, type Group, type LineSegments } from 'three'
import { buildParticleGeometry, setParticleCount } from '../../effects/particles/particleGeometry'
import { useGlyphLabel } from '../../effects/typography/GlyphLayer'
import { corruptText, formatCoord } from '../../effects/typography/glyphs'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { FRAME_STAGE } from '../../engine/frameStages'
import { PARTICLE_CAPACITY } from '../../engine/PerformanceManager'
import { useWorld } from '../../scenes/WorldContext'
import { buildShellGeometry } from './voidGeometry'
import { VOID_PALETTE, createAccretionMaterial, createShellMaterial } from './voidMaterials'

/**
 * VOID — a localized failure of spatial logic. Its body is mostly ABSENCE: the screen-space
 * lens (effects/distortion) erases and bends the image, the world field bends the grid and the
 * data around it. What is rendered here is what it destroys: a fractured lattice that cannot
 * hold its shape, data spiralling into the horizon, and coordinates that never resolve.
 */
export function VoidEntity() {
  const engine = useCinematicEngine()
  const { uniforms: world, profile } = useWorld()
  const group = useRef<Group>(null)
  const outer = useRef<LineSegments>(null)
  const innerShell = useRef<LineSegments>(null)

  const res = useMemo(
    () => ({
      shell: buildShellGeometry(1, 1, 31),
      innerShell: buildShellGeometry(1, 0, 32),
      shellMaterial: createShellMaterial(world),
      accretion: buildParticleGeometry({
        capacity: PARTICLE_CAPACITY.accretion,
        seed: 6060,
        bounds: new Sphere(new Vector3(), 8),
        attributes: { aSeed: 4 },
        init(w, _i, rng) {
          w.set('position', 0, 0, 0)
          w.set('aSeed', rng(), Math.pow(rng(), 1.8), rng(), rng())
        },
      }),
      accretionMaterial: createAccretionMaterial(world),
    }),
    [world],
  )
  useEffect(
    () => () => {
      for (const r of Object.values(res)) r.dispose()
    },
    [res],
  )
  useEffect(() => setParticleCount(res.accretion, profile.particles.accretion), [res, profile.particles.accretion])

  const label = useGlyphLabel({ maxChars: 40, size: 0.066, color: VOID_PALETTE.label, offset: [2.4, -1] })
  const scratch = useMemo(() => ({ anchor: new Vector3(), lastTick: -1 }), [])

  useFrame(() => {
    const s = engine.state.void
    const e = engine.elapsed * engine.motion.ambient
    const g = group.current
    if (g) {
      g.position.copy(s.position)
      g.visible = s.mass > 0.001
    }
    const R = s.radius
    if (outer.current) {
      outer.current.scale.setScalar(R * 1.45)
      outer.current.rotation.set(e * 0.11, e * 0.07, 0)
    }
    if (innerShell.current) {
      innerShell.current.scale.setScalar(R * 1.12)
      innerShell.current.rotation.set(-e * 0.19, 0.4, e * 0.13)
    }
    const su = res.shellMaterial.uniforms
    su.uReveal.value = s.reveal
    su.uCorruption.value = s.corruption
    res.accretionMaterial.uniforms.uReveal.value = s.reveal

    const l = label.current
    if (l) {
      scratch.anchor.set(s.position.x, s.position.y + R * 1.9, s.position.z)
      l.setAnchor(scratch.anchor)
      l.setOpacity(s.readout * 0.85)
      l.setGlitch(0.25 + s.corruption * 0.5)
      // Its coordinates are measurable for a frame at a time, then corrupt again.
      const tick = Math.floor((engine.elapsed + engine.time) * 12 * Math.max(engine.motion.ambient, 0.4))
      if (s.readout > 0 && tick !== scratch.lastTick) {
        scratch.lastTick = tick
        const p = s.position
        const coords = `X${formatCoord(p.x)} Y${formatCoord(p.y)} Z${formatCoord(p.z)}`
        l.setText(`VOID\n${corruptText(coords, 0.45 + s.corruption * 0.4, 17, tick)}`)
      }
    }
  }, FRAME_STAGE.WORLD)

  return (
    <group ref={group}>
      <lineSegments ref={outer} geometry={res.shell} material={res.shellMaterial} frustumCulled={false} dispose={null} />
      <lineSegments ref={innerShell} geometry={res.innerShell} material={res.shellMaterial} frustumCulled={false} dispose={null} />
      <points geometry={res.accretion} material={res.accretionMaterial} rotation={[0.38, 0, 0.22]} frustumCulled={false} dispose={null} />
    </group>
  )
}
