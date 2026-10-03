import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, ShaderMaterial, Vector3 } from 'three'
import { useGlyphLabel } from '../../effects/typography/GlyphLayer'
import { formatCoord, scrambleText } from '../../effects/typography/glyphs'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { FRAME_STAGE } from '../../engine/frameStages'
import { useWorld } from '../../scenes/WorldContext'
import { GLSL, fieldUniforms } from '../../shaders'
import vertexShader from './attackVector.vert.glsl?raw'
import { buildAttackVectorGeometry } from './attackVectorGeometry'
import { VELOCITY_PALETTE } from './velocityMaterials'

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uFail;
uniform float uResult;
varying float vAlpha;
varying float vKind;
void main() {
  if (vAlpha < 0.003) discard;
  // The intercept turns to the VOID's colour once the collision has failed.
  vec3 c = mix(uColor, uFail, step(1.5, vKind) * uResult);
  gl_FragColor = vec4(c, vAlpha);
}`

const RESULT_TEXT: Record<number, string> = {
  1: 'COLLISION\nFALSE',
  2: 'COLLISION FALSE\nHITS 0/2',
}
const LOCK_TITLE: Record<number, string> = { 1: 'VECTOR LOCK', 2: 'VECTOR 02 · ADAPT' }

/**
 * The prediction layer of VELOCITY's attack: trajectory, direction chevrons, intercept reticle,
 * lock telemetry and outcome. Everything reads `state.attack`; nothing here owns timing.
 */
export function AttackVector() {
  const engine = useCinematicEngine()
  const { uniforms: world } = useWorld()

  const res = useMemo(() => {
    const geometry = buildAttackVectorGeometry(0.42 * 2.4)
    const material = new ShaderMaterial({
      uniforms: {
        ...fieldUniforms(world),
        uFrom: { value: engine.state.attack.from },
        uTo: { value: engine.state.attack.to },
        uDraw: { value: 0 },
        uVisible: { value: 0 },
        uLock: { value: 0 },
        uResult: { value: 0 },
        uColor: { value: VELOCITY_PALETTE.vector },
        uFail: { value: [1.1, 0.35, 1.5] },
      },
      vertexShader: GLSL.common + GLSL.field + vertexShader,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    return { geometry, material }
  }, [world, engine])
  useEffect(
    () => () => {
      res.geometry.dispose()
      res.material.dispose()
    },
    [res],
  )

  const lockLabel = useGlyphLabel({ maxChars: 64, size: 0.062, color: VELOCITY_PALETTE.label, offset: [0, -1] })
  const interceptLabel = useGlyphLabel({ maxChars: 28, size: 0.075, color: [1.0, 0.75, 1.45], offset: [2.6, -1] })
  const scratch = useMemo(() => ({ anchor: new Vector3(), delta: new Vector3(), lockKey: '', hitKey: '' }), [])

  useFrame(() => {
    const a = engine.state.attack
    const u = res.material.uniforms
    u.uDraw.value = a.draw
    u.uVisible.value = a.visible
    u.uLock.value = a.lock
    u.uResult.value = a.result
    const step = Math.floor((engine.elapsed + engine.time) * 20)

    const l = lockLabel.current
    if (l) {
      // Placed along the predicted line, ahead of VELOCITY: the data belongs to the vector.
      scratch.anchor.lerpVectors(a.from, engine.state.void.position, 0.32).add(UP_LABEL)
      l.setAnchor(scratch.anchor)
      l.setOpacity(a.lock > 0 ? Math.min(1, a.lock * 2) * a.visible : 0)
      const key = `${a.index}:${Math.round(a.lock * 40)}:${step}`
      if (a.lock > 0 && key !== scratch.lockKey) {
        scratch.lockKey = key
        const d = scratch.delta.copy(engine.state.void.position).sub(a.from)
        const text =
          `${LOCK_TITLE[a.index] ?? 'VECTOR'}\nΔX${formatCoord(d.x)} ΔY${formatCoord(d.y)} ΔZ${formatCoord(d.z)}\n` +
          `ETA ${(a.index === 2 ? 0.12 : 0.15).toFixed(2)}  INTERCEPT`
        l.setText(scrambleText(text, a.lock * 1.2, 31 + a.index, step))
      }
    }

    const h = interceptLabel.current
    if (h) {
      const vd = engine.state.void
      scratch.anchor.set(vd.position.x, vd.position.y - vd.radius * 2.9, vd.position.z)
      h.setAnchor(scratch.anchor)
      const showResult = a.result > 0
      h.setOpacity(showResult ? Math.min(1, a.result * 1.5) : a.visible * a.lock * 0.8)
      h.setGlitch(showResult ? 0.06 + vd.phase * 0.15 : 0)
      const target = showResult ? (RESULT_TEXT[a.index] ?? RESULT_TEXT[1]) : 'INTERCEPT'
      const progress = showResult ? a.result * 1.15 : a.lock * 1.4
      const key = `${target}:${Math.round(progress * 40)}:${progress < 1 ? step : -1}`
      if ((showResult || a.lock > 0) && key !== scratch.hitKey) {
        scratch.hitKey = key
        h.setText(scrambleText(target, progress, 41, step))
      }
    }
  }, FRAME_STAGE.WORLD)

  return <lineSegments geometry={res.geometry} material={res.material} frustumCulled={false} dispose={null} />
}

const UP_LABEL = new Vector3(0, 0.42, 0)
