import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Object3D,
  PlaneGeometry,
  PointLight,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  TetrahedronGeometry,
  Vector3,
} from 'three'
import { useCinematicEngine } from '../../engine/CinematicContext'
import { FRAME_STAGE } from '../../engine/frameStages'
import { useWorld } from '../../scenes/WorldContext'
import { useExperience } from '../../../store/experienceStore'
import { createRng } from '../../../utils/random'
import { useGlyphAtlasUniforms } from '../typography/GlyphLayer'
import { glyphIndex } from '../typography/glyphs'
import { createDebris, debrisAt } from './debris'
import { domeFrag, domeVert, glyphDebrisFrag, glyphDebrisVert, smokeFrag, smokeVert } from './impactShaders'

// Code as material: symbols and fragments, never readable words competing with the fight.
const TOKENS = ['{', '}', '[', ']', '<', '>', '0', '1', 'Δ', 'λ', '∅', '/', '#', '01', '10', '<>', '{}', '=', '*', '|']
const SMOKE = 40

/**
 * The hero impact, layered: contact light dome → ground shockwave ring → lit geometry shards and
 * code-glyph debris (ballistic, spinning, some dragged back into VOID) → smoke and haze → a light
 * that falls off into the aftermath. Everything is a function of `impact.age`.
 */
export function Impact() {
  const engine = useCinematicEngine()
  const { profile } = useWorld()
  const atlas = useGlyphAtlasUniforms()
  const lite = profile.tier === 'LITE'

  const parts = useMemo(() => {
    const root = new Group()

    const domeMat = new ShaderMaterial({
      uniforms: { uIntensity: { value: 0 } },
      vertexShader: domeVert,
      fragmentShader: domeFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const dome = new Mesh(new SphereGeometry(1, 40, 24), domeMat)
    const coreFlash = new Mesh(new IcosahedronGeometry(1, 2), new MeshBasicMaterial({ color: new Color(3, 3.3, 3.5), transparent: true, blending: AdditiveBlending, depthWrite: false }))

    const ringMat = new MeshBasicMaterial({ color: new Color(0.6, 1.9, 2.5), transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })
    const shockRing = new Mesh(new RingGeometry(0.965, 1.0, 128).rotateX(-Math.PI / 2), ringMat)
    const ring2Mat = ringMat.clone()
    ring2Mat.color = new Color(0.8, 0.25, 1.6)
    const shockRing2 = new Mesh(new RingGeometry(0.975, 1.0, 128).rotateX(-Math.PI / 2), ring2Mat)
    root.add(dome, coreFlash, shockRing, shockRing2)

    // Geometry shards: lit, faceted, hot when they leave and cooling as they fall.
    const shardCount = lite ? 40 : 64
    const shardMat = new MeshStandardMaterial({ color: 0x1b2a31, metalness: 0.4, roughness: 0.35, flatShading: true, emissive: new Color(0.4, 1.4, 1.9), emissiveIntensity: 0 })
    const shards = new InstancedMesh(new TetrahedronGeometry(1, 0).scale(1, 0.45, 0.7), shardMat, shardCount)
    shards.instanceMatrix.setUsage(DynamicDrawUsage)
    const shardData = createDebris(shardCount, 101, 0.25)
    root.add(shards)

    // Code glyph debris: tokens of the destroyed construct, one instance per character.
    const glyphRng = createRng(77)
    const glyphTokens: Array<{ piece: number; char: number; col: number }> = []
    const glyphPieces = createDebris(lite ? 24 : 36, 202, 0.35, 0.9)
    glyphPieces.forEach((_, i) => {
      const tok = TOKENS[Math.floor(glyphRng() * TOKENS.length)]
      ;[...tok].forEach((ch, col) => glyphTokens.push({ piece: i, char: glyphIndex(ch), col }))
    })
    const quad = new PlaneGeometry(1, 1)
    const glyphGeo = new InstancedBufferGeometry()
    glyphGeo.index = quad.index
    glyphGeo.setAttribute('position', quad.getAttribute('position'))
    const gOffset = new InstancedBufferAttribute(new Float32Array(glyphTokens.length * 3), 3).setUsage(DynamicDrawUsage)
    const gData = new InstancedBufferAttribute(new Float32Array(glyphTokens.length * 4), 4).setUsage(DynamicDrawUsage)
    glyphTokens.forEach((g, i) => gData.setXYZW(i, g.char, g.col, 0, 0))
    glyphGeo.setAttribute('aOffset', gOffset)
    glyphGeo.setAttribute('aData', gData)
    const gSpin = new InstancedBufferAttribute(new Float32Array(glyphTokens.length), 1).setUsage(DynamicDrawUsage)
    glyphGeo.setAttribute('aSpin', gSpin)
    glyphGeo.instanceCount = glyphTokens.length
    const glyphMat = new ShaderMaterial({
      uniforms: { uAtlas: atlas.uAtlas, uGrid: atlas.uGrid, uCellScale: atlas.uCellScale },
      vertexShader: glyphDebrisVert,
      fragmentShader: glyphDebrisFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const glyphs = new Mesh(glyphGeo, glyphMat)
    root.add(glyphs)

    // Smoke / haze: soft billboards that roll out from the crater and hang in the light.
    const smokeGeo = new InstancedBufferGeometry()
    const sq = new PlaneGeometry(1, 1)
    smokeGeo.index = sq.index
    smokeGeo.setAttribute('position', sq.getAttribute('position'))
    const srng = createRng(55)
    const sSeed = new Float32Array(SMOKE * 4)
    for (let i = 0; i < sSeed.length; i++) sSeed[i] = srng()
    smokeGeo.setAttribute('aSeed', new InstancedBufferAttribute(sSeed, 4))
    smokeGeo.instanceCount = SMOKE
    const smokeMat = new ShaderMaterial({
      uniforms: { uAge: { value: -1 }, uSmoke: { value: 0 }, uLight: { value: 0 }, uOrigin: { value: new Vector3() } },
      vertexShader: smokeVert,
      fragmentShader: smokeFrag,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    })
    const smoke = new Mesh(smokeGeo, smokeMat)
    root.add(smoke)

    const light = new PointLight(new Color(0.7, 1.0, 1.1), 0, 26, 1.7)
    const ember = new PointLight(new Color(0.6, 0.35, 1.0), 0, 6, 2)
    root.add(light, ember)
    root.traverse((o) => (o.frustumCulled = false))
    return { root, dome, domeMat, coreFlash, shockRing, shockRing2, ringMat, ring2Mat, shards, shardMat, shardData, glyphs, glyphMat, glyphTokens, glyphPieces, gOffset, gData, gSpin, smoke, smokeMat, light, ember, quad, sq }
  }, [atlas, lite])

  useEffect(
    () => () => {
      parts.root.traverse((o) => (o as Mesh).geometry?.dispose())
      parts.quad.dispose()
      parts.sq.dispose()
      for (const m of [parts.domeMat, parts.ringMat, parts.ring2Mat, parts.shardMat, parts.glyphMat, parts.smokeMat, parts.coreFlash.material as MeshBasicMaterial]) m.dispose()
    },
    [parts],
  )

  const scratch = useMemo(() => ({ o: new Object3D(), p: new Vector3(), q: new Quaternion(), m: new Matrix4(), toVoid: new Vector3(), origin: new Vector3() }), [])

  useFrame(() => {
    const im = engine.state.impact
    const age = im.age
    const active = age >= 0 && useExperience.getState().fx === 'full'
    parts.root.visible = active
    if (!active) {
      parts.light.intensity = 0
      parts.ember.intensity = 0
      return
    }
    const c = scratch.origin.copy(im.position)

    // Contact dome + white core flash.
    // The dome waits out the impact frame (an inverted bright disc would read as a hole).
    const da = Math.max(0, age - 0.067)
    const grow = 1 - Math.exp(-da * 12)
    parts.dome.position.copy(c)
    parts.dome.scale.setScalar(0.3 + grow * 3.0)
    parts.domeMat.uniforms.uIntensity.value = im.light * Math.exp(-da * 6) * 0.35
    // Spent layers stop drawing.
    parts.dome.visible = age > 0.067 && parts.domeMat.uniforms.uIntensity.value > 0.002
    parts.coreFlash.visible = age > 0.067 && da < 1 / 6
    parts.coreFlash.position.copy(c)
    parts.coreFlash.scale.setScalar(0.1 + grow * 0.3)
    ;(parts.coreFlash.material as MeshBasicMaterial).opacity = Math.max(0, 1 - da * 6)

    // Ground shockwaves.
    parts.shockRing.position.set(c.x, 0.03, c.z)
    parts.shockRing.scale.setScalar(0.2 + im.shock * 11)
    parts.ringMat.opacity = im.shock > 0 && im.shock < 1 ? Math.pow(1 - im.shock, 1.4) : 0
    parts.shockRing.visible = parts.ringMat.opacity > 0
    const s2 = Math.min(1, Math.max(0, (age - 0.08) / 0.9))
    parts.shockRing2.position.set(c.x, 0.035, c.z)
    parts.shockRing2.scale.setScalar(0.2 + (1 - Math.pow(1 - s2, 3)) * 6.5)
    parts.ring2Mat.opacity = s2 > 0 && s2 < 1 ? (1 - s2) * 0.8 : 0
    parts.shockRing2.visible = parts.ring2Mat.opacity > 0

    // Shards.
    const vd = engine.state.fighters.void
    scratch.toVoid.set(vd.position.x, vd.position.y + 1.2, vd.position.z)
    const pull = smoothstep01((age - 1.5) / 1.8)
    parts.shardData.forEach((piece, i) => {
      const angle = debrisAt(piece, c, age, scratch.p)
      let size = piece.size
      if (piece.absorbed) {
        scratch.p.lerp(scratch.toVoid, pull)
        size *= 1 - pull
      }
      scratch.q.setFromAxisAngle(piece.spinAxis, angle)
      scratch.o.position.copy(scratch.p)
      scratch.o.quaternion.copy(scratch.q)
      scratch.o.scale.setScalar(Math.max(size, 1e-4) * Math.min(1, age * 20))
      scratch.o.updateMatrix()
      parts.shards.setMatrixAt(i, scratch.o.matrix)
    })
    parts.shards.instanceMatrix.needsUpdate = true
    parts.shardMat.emissiveIntensity = 2.6 * Math.exp(-age * 1.3) + 0.08

    // Glyph debris.
    parts.glyphTokens.forEach((g, i) => {
      const piece = parts.glyphPieces[g.piece]
      const angle = debrisAt(piece, c, age * 0.9, scratch.p)
      let fade = 1 - smoothstep01((age - 2.2 - piece.seed * 1.5) / 1.2)
      if (piece.absorbed) {
        scratch.p.lerp(scratch.toVoid, pull)
        fade *= 1 - pull * 0.7
      }
      parts.gOffset.setXYZ(i, scratch.p.x, scratch.p.y, scratch.p.z)
      const size = 0.06 + piece.size * 0.35
      parts.gData.setXYZW(i, g.char, g.col, size, Math.max(0, fade) * Math.min(1, age * 12))
      parts.gSpin.setX(i, Math.sin(angle) * 0.6)
    })
    parts.gOffset.needsUpdate = true
    parts.gData.needsUpdate = true
    parts.gSpin.needsUpdate = true

    // Smoke.
    const su = parts.smokeMat.uniforms
    su.uAge.value = age
    su.uSmoke.value = im.smoke
    su.uLight.value = im.light
    ;(su.uOrigin.value as Vector3).set(c.x, 0, c.z)

    parts.light.position.copy(c)
    parts.light.intensity = im.light * 45
    parts.ember.position.set(c.x, 0.25, c.z)
    parts.ember.intensity = im.crater * (1.2 + Math.exp(-age * 0.8) * 4)
  }, FRAME_STAGE.WORLD)

  return <primitive name="impact" object={parts.root} dispose={null} />
}

function smoothstep01(x: number): number {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}
