import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Euler, Quaternion, Sphere, Vector3, type Group, type LineSegments } from 'three'
import { corruptText, formatCoord, scrambleText } from '../../effects/typography/glyphs'
import { useGlyphLabel } from '../../effects/typography/GlyphLayer'
import { buildParticleGeometry, setParticleCount } from '../../effects/particles/particleGeometry'
import { Afterimages } from '../../effects/trails/Afterimages'
import { VectorTrail } from '../../effects/trails/VectorTrail'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { VELOCITY_HOME } from '../../engine/CinematicState'
import { FRAME_STAGE } from '../../engine/frameStages'
import { PARTICLE_CAPACITY } from '../../engine/PerformanceManager'
import { useWorld } from '../../scenes/WorldContext'
import { smoothstep } from '../../../utils/math'
import { buildKernelGeometry, buildRingGeometry, buildTargetGeometry } from './velocityGeometry'
import {
  VELOCITY_PALETTE,
  createCoreMaterial,
  createVelocityLineMaterial,
  createVelocityStreakMaterial,
} from './velocityMaterials'

/** Telemetry refreshes like an instrument (20 Hz), not every frame. */
const READOUT_HZ = 20
/** Afterimage capture: replicas per second of travel above the speed threshold. */
const GHOST_RATE = 45
const GHOST_MIN_SPEED = 18
const GHOST_CAPACITY = 16
const RING_A_SIGHT = new Quaternion().setFromEuler(new Euler(0, 0, Math.PI / 2))
const RING_B_SIGHT = RING_A_SIGHT.clone()
const MARKER_TEXT = `→ X${formatCoord(VELOCITY_HOME.x)} Y${formatCoord(VELOCITY_HOME.y)} Z${formatCoord(VELOCITY_HOME.z)}`

/**
 * VELOCITY — a coherent kinetic force built from vectors: a faceted direction kernel, two
 * precision rings, a halo of kinetic streak particles, a ribbon wake and live telemetry.
 * All parameters are read from the cinematic state; nothing here owns timing.
 */
export function VelocityEntity() {
  const engine = useCinematicEngine()
  const { uniforms: world, profile } = useWorld()
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)

  const kernelGroup = useRef<Group>(null)
  const kernel = useRef<LineSegments>(null)
  const inner = useRef<Group>(null)
  const ringA = useRef<LineSegments>(null)
  const ringB = useRef<LineSegments>(null)

  const res = useMemo(() => {
    const streakGeometry = buildParticleGeometry({
      capacity: PARTICLE_CAPACITY.velocity,
      seed: 4242,
      verticesPerParticle: 2,
      bounds: new Sphere(new Vector3(), 60),
      attributes: { aSeed: 4 },
      init(w, _i, rng) {
        // Elongated shell around the kernel, denser near the direction axis.
        const u = rng() * 2 - 1
        const theta = rng() * Math.PI * 2
        const r = 0.35 + Math.pow(rng(), 0.6) * 1.25
        const s = Math.sqrt(1 - u * u)
        w.set('position', u * r * 1.5, s * Math.cos(theta) * r * 0.55, s * Math.sin(theta) * r * 0.55)
        w.set('aSeed', rng(), rng(), rng(), rng())
      },
    })
    const coreGeometry = new BufferGeometry()
    coreGeometry.setAttribute('position', new BufferAttribute(new Float32Array(3), 3))
    return {
      kernel: buildKernelGeometry(),
      ringA: buildRingGeometry(0.95, 40, 8, 11),
      ringB: buildRingGeometry(1.32, 24, 12, 12),
      target: buildTargetGeometry(VELOCITY_HOME.y),
      lineMaterial: createVelocityLineMaterial(world, VELOCITY_PALETTE.line),
      targetMaterial: createVelocityLineMaterial(world, VELOCITY_PALETTE.dim, 0.8),
      streakGeometry,
      streakMaterial: createVelocityStreakMaterial(world, engine.derived.velocityMotion),
      coreGeometry,
      coreMaterial: createCoreMaterial(world),
    }
  }, [world, engine])

  useEffect(
    () => () => {
      for (const r of Object.values(res)) r.dispose()
    },
    [res],
  )

  const trail = useMemo(
    () => new VectorTrail({ length: profile.trailLength, width: 7, color: VELOCITY_PALETTE.trail }),
    [profile.trailLength],
  )
  useEffect(() => () => trail.dispose(), [trail])

  const ghosts = useMemo(() => new Afterimages(res.kernel, GHOST_CAPACITY, world, VELOCITY_PALETTE.ghost), [res, world])
  useEffect(() => () => ghosts.dispose(), [ghosts])
  useEffect(() => engine.on('seek', () => ghosts.clear()), [engine, ghosts])

  useEffect(() => {
    setParticleCount(res.streakGeometry, profile.particles.velocity)
  }, [res, profile.particles.velocity])

  const marker = useGlyphLabel({ maxChars: 28, size: 0.072, color: VELOCITY_PALETTE.label, offset: [1.2, 0] })
  const readout = useGlyphLabel({ maxChars: 84, size: 0.064, color: VELOCITY_PALETTE.label, offset: [2.2, -1] })

  const scratch = useMemo(
    () => ({
      anchor: new Vector3(),
      visible: false,
      lastReadout: -1,
      lastMarker: -1,
      lastGhost: -1,
      spin: new Quaternion(),
      euler: new Euler(),
    }),
    [],
  )

  useEffect(() => engine.on('seek', () => (scratch.visible = false)), [engine, scratch])

  useFrame(() => {
    const s = engine.state.velocity
    const pos = world.uVelocityPos.value
    const speed = engine.derived.velocitySpeed
    const e = engine.elapsed * engine.motion.ambient

    // Kernel transform.
    const g = kernelGroup.current
    if (g) {
      g.position.copy(pos)
      g.rotation.order = 'YZX'
      g.rotation.set(0, s.heading, s.pitch)
      g.visible = s.reveal > 0.001
      // Streamline at speed: rings collapse toward the axis.
      const stream = smoothstep(4, 30, speed)
      g.scale.set(1 + stream * 0.6, 1 - stream * 0.55, 1 - stream * 0.55)
    }
    if (kernel.current) kernel.current.rotation.x = e * 0.35
    if (inner.current) inner.current.rotation.x = -e * 0.9
    // Targeting: the gyroscopic rings stop spinning and align into a sight along the heading.
    const ra = ringA.current
    if (ra) {
      scratch.spin.setFromEuler(scratch.euler.set(0.42, e * 0.5, 0.25))
      ra.quaternion.slerpQuaternions(scratch.spin, RING_A_SIGHT, s.focus)
      ra.position.x = 0.55 * s.focus
      ra.scale.setScalar(1 - 0.45 * s.focus)
    }
    const rb = ringB.current
    if (rb) {
      scratch.spin.setFromEuler(scratch.euler.set(-0.7, -e * 0.28, 1.15))
      rb.quaternion.slerpQuaternions(scratch.spin, RING_B_SIGHT, s.focus)
      rb.position.x = 1.85 * s.focus
      rb.scale.setScalar(1 - 0.62 * s.focus)
    }

    // Afterimages: replicas left behind at impossible speed.
    if (s.ghosts > 0 && speed > GHOST_MIN_SPEED && engine.elapsed - scratch.lastGhost >= 1 / GHOST_RATE) {
      scratch.lastGhost = engine.elapsed
      ghosts.capture(pos, s.heading, s.pitch, engine.elapsed)
    }

    const lu = res.lineMaterial.uniforms
    lu.uAssemble.value = s.assemble
    lu.uReveal.value = s.reveal * (0.75 + s.energy * 0.5)
    lu.uInterference.value = s.interference

    const tu = res.targetMaterial.uniforms
    tu.uAssemble.value = s.marker
    tu.uReveal.value = s.marker
    tu.uInterference.value = 0

    const su = res.streakMaterial.uniforms
    su.uAssemble.value = s.assemble
    su.uReveal.value = s.reveal
    su.uEnergy.value = s.energy
    su.uHeading.value = s.heading

    const cu = res.coreMaterial.uniforms
    cu.uIntensity.value = s.reveal * (0.35 + 0.65 * s.assemble) * (0.6 + s.energy * 0.7)
    cu.uSize.value = 0.26 + s.energy * 0.22

    // Wake.
    if (!scratch.visible && s.reveal > 0) trail.reset(pos)
    else trail.push(pos)
    scratch.visible = s.reveal > 0
    trail.setOpacity(s.reveal * (0.25 + 0.75 * smoothstep(1, 12, speed)))
    trail.setResolution(size.width * dpr, size.height * dpr)

    // Arrival coordinate: published before the arrival, consumed by it.
    const m = marker.current
    if (m) {
      scratch.anchor.set(VELOCITY_HOME.x, VELOCITY_HOME.y + 0.42, VELOCITY_HOME.z)
      m.setAnchor(scratch.anchor)
      m.setOpacity(s.marker > 0.001 ? 0.35 + 0.65 * s.marker : 0)
      const key = s.marker <= 0 ? -2 : s.marker >= 1 ? -3 : Math.floor((engine.elapsed + engine.time) * 24) * 128 + Math.round(s.marker * 100)
      if (key !== scratch.lastMarker) {
        scratch.lastMarker = key
        m.setText(scrambleText(MARKER_TEXT, s.marker * 1.1, 3, Math.floor((engine.elapsed + engine.time) * 24)))
      }
    }

    const r = readout.current
    if (r) {
      scratch.anchor.set(pos.x, pos.y + 0.62, pos.z)
      r.setAnchor(scratch.anchor)
      // While a vector is locked the instrument shows the vector (AttackVector), not the position.
      const atk = engine.state.attack
      r.setOpacity(s.readout * (1 - s.interference * 0.35) * (1 - atk.lock * atk.visible * 0.9))
      r.setGlitch(s.interference)
      // Keyed on both clocks so a seek while paused also refreshes the instrument.
      const tick = Math.floor((engine.elapsed + engine.time) * READOUT_HZ)
      if (s.readout > 0 && tick !== scratch.lastReadout) {
        scratch.lastReadout = tick
        // Inside a phased VOID its own position stops resolving consistently.
        const vd = engine.state.void
        const desync = vd.phase * smoothstep(2.2, 0.6, pos.distanceTo(vd.position))
        const coords = `X${formatCoord(pos.x)} Y${formatCoord(pos.y)} Z${formatCoord(pos.z)}`
        const text =
          `${desync > 0.3 ? 'VELOCITY · DESYNC' : 'VELOCITY'}\n${corruptText(coords, desync * 0.6, 23, tick)}\n` +
          `|V| ${formatCoord(speed, 3, 1).slice(1)}  ΔT ${engine.dt.toFixed(3)}`
        r.setText(scrambleText(text, s.readout * 1.15, 9, tick))
      }
    }
  }, FRAME_STAGE.WORLD)

  return (
    <>
      <group ref={kernelGroup}>
        <lineSegments ref={kernel} geometry={res.kernel} material={res.lineMaterial} frustumCulled={false} dispose={null} />
        <group ref={inner} scale={0.45}>
          <lineSegments geometry={res.kernel} material={res.lineMaterial} frustumCulled={false} dispose={null} />
        </group>
        <lineSegments ref={ringA} geometry={res.ringA} material={res.lineMaterial} frustumCulled={false} dispose={null} />
        <lineSegments ref={ringB} geometry={res.ringB} material={res.lineMaterial} frustumCulled={false} dispose={null} />
        <points geometry={res.coreGeometry} material={res.coreMaterial} frustumCulled={false} dispose={null} />
      </group>
      <lineSegments geometry={res.streakGeometry} material={res.streakMaterial} frustumCulled={false} dispose={null} />
      <primitive object={trail.mesh} dispose={null} />
      <primitive object={ghosts.mesh} dispose={null} />
      <lineSegments
        geometry={res.target}
        material={res.targetMaterial}
        position={[VELOCITY_HOME.x, 0.004, VELOCITY_HOME.z]}
        frustumCulled={false}
        dispose={null}
      />
    </>
  )
}
