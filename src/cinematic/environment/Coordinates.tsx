import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import { useGlyphLabel } from '../effects/typography/GlyphLayer'
import { scrambleText } from '../effects/typography/glyphs'
import { useCinematicEngine } from '../engine/CinematicContext'
import { FRAME_STAGE } from '../engine/frameStages'
import { useWorld } from '../scenes/WorldContext'
import { createCoreMaterial } from '../entities/Velocity/velocityMaterials'
import { smoothstep } from '../../utils/math'

const ORIGIN_TEXT = 'ORIGIN\n+00.00 +00.00 +00.00'
const AXIS_MARKS = [-16, -12, -8, -4, 4, 8, 12, 16]
const LABEL_COLOR = [0.3, 0.62, 0.66] as const

function AxisLabel({ x, z }: { x: number; z: number }) {
  const engine = useCinematicEngine()
  const label = useGlyphLabel({ maxChars: 3, size: 0.2, color: LABEL_COLOR, billboard: false })
  const anchor = useMemo(() => new Vector3(x + (x !== 0 ? -0.2 : 0.18), 0, z + (z !== 0 ? 0 : 0.42)), [x, z])
  const value = x !== 0 ? x : -z
  const text = `${value > 0 ? '+' : '-'}${String(Math.abs(value)).padStart(2, '0')}`
  useFrame(() => {
    const l = label.current
    if (!l) return
    const dist = Math.hypot(x, z)
    const reveal = smoothstep(dist + 0.5, dist + 4, engine.state.world.reveal)
    l.setAnchor(anchor)
    l.setText(text)
    l.setOpacity(reveal * 0.75)
  }, FRAME_STAGE.WORLD)
  return null
}

/**
 * The coordinate system itself: the origin (the first thing that exists) and sparse axis
 * graduations written onto the floor.
 */
export function Coordinates() {
  const engine = useCinematicEngine()
  const { uniforms: world } = useWorld()
  const origin = useGlyphLabel({ maxChars: 26, size: 0.05, color: [0.75, 1.45, 1.6], offset: [1.1, -0.4] })
  const anchor = useMemo(() => new Vector3(0, 0.02, 0), [])
  const lastStep = useRef(-1)

  const res = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, 0.015, 0]), 3))
    return { geometry, material: createCoreMaterial(world) }
  }, [world])
  useEffect(
    () => () => {
      res.geometry.dispose()
      res.material.dispose()
    },
    [res],
  )

  useFrame(() => {
    const w = engine.state.world
    res.material.uniforms.uIntensity.value = w.origin * 0.9
    res.material.uniforms.uSize.value = 0.09
    const l = origin.current
    if (!l) return
    l.setAnchor(anchor)
    l.setOpacity(Math.min(1, w.origin * 1.4) * (1 - smoothstep(6, 20, w.reveal) * 0.6))
    const step = Math.floor((engine.elapsed + engine.time) * 24)
    if (step !== lastStep.current) {
      lastStep.current = step
      l.setText(scrambleText(ORIGIN_TEXT, w.axis * 1.2, 5, step))
    }
  }, FRAME_STAGE.WORLD)

  const marks = useMemo(() => AXIS_MARKS.flatMap((m) => [{ x: m, z: 0 }, { x: 0, z: m }]), [])

  return (
    <>
      <points geometry={res.geometry} material={res.material} frustumCulled={false} dispose={null} />
      {marks.map((m) => (
        <AxisLabel key={`${m.x}:${m.z}`} x={m.x} z={m.z} />
      ))}
    </>
  )
}
