import {
  AdditiveBlending,
  DataTexture,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
  RedFormat,
  ShaderMaterial,
  Vector3,
  type Texture,
} from 'three'
import { GLSL, type WorldUniforms } from '../../shaders'
import { ATLAS_CELL, ATLAS_FONT_PX, GLYPH_ADVANCE_EM, type GlyphAtlas } from './glyphAtlas'
import fragmentShader from './glyph.frag.glsl?raw'
import vertexShader from './glyph.vert.glsl?raw'
import { SPACE_GLYPH, glyphIndex } from './glyphs'

export interface LabelOptions {
  maxChars: number
  /** Glyph height in world units. */
  size: number
  /** Linear HDR colour (values > 1 bloom). */
  color: readonly [number, number, number]
  /** Billboard toward the camera (default) or lie flat on the ground plane. */
  billboard?: boolean
  /** Offset of the text block from the anchor, in glyph units [columns, lines]. */
  offset?: readonly [number, number]
}

/** A reserved range of glyph instances. Writes are cheap and deduplicated. */
export class GlyphLabel {
  private text = ''
  private opacity = -1
  private glitch = -1
  private readonly anchor = new Vector3(Number.NaN, 0, 0)

  constructor(
    private readonly field: GlyphField,
    readonly start: number,
    readonly capacity: number,
    private readonly options: LabelOptions,
  ) {
    const [r, g, b] = options.color
    for (let i = 0; i < capacity; i++) {
      field.writeStyleColor(start + i, r, g, b)
      field.writeMode(start + i, options.billboard === false ? 0 : 1, 0)
    }
    this.setOpacity(0)
    this.setText('')
  }

  /** Multi-line text with '\n'. Only changed glyphs are rewritten. */
  setText(text: string): void {
    if (text === this.text) return
    this.text = text
    const [ox, oy] = this.options.offset ?? [0, 0]
    let col = 0
    let line = 0
    let slot = 0
    for (let i = 0; i < text.length && slot < this.capacity; i++) {
      const c = text[i]
      if (c === '\n') {
        line++
        col = 0
        continue
      }
      const glyph = c === ' ' ? SPACE_GLYPH : glyphIndex(c)
      this.field.writeGlyph(this.start + slot, col + ox, line + oy, c === ' ' ? -1 : glyph, this.options.size)
      slot++
      col++
    }
    for (; slot < this.capacity; slot++) this.field.writeGlyph(this.start + slot, 0, 0, -1, this.options.size)
  }

  setAnchor(p: Vector3): void {
    if (p.equals(this.anchor)) return
    this.anchor.copy(p)
    for (let i = 0; i < this.capacity; i++) this.field.writeAnchor(this.start + i, p.x, p.y, p.z)
  }

  setOpacity(value: number): void {
    const v = Math.round(value * 1000) / 1000
    if (v === this.opacity) return
    this.opacity = v
    for (let i = 0; i < this.capacity; i++) this.field.writeOpacity(this.start + i, v)
  }

  /** 0..1 glitch/interference (jitter, dropouts, red shift). */
  setGlitch(value: number): void {
    const v = Math.round(value * 100) / 100
    if (v === this.glitch) return
    this.glitch = v
    const billboard = this.options.billboard === false ? 0 : 1
    for (let i = 0; i < this.capacity; i++) this.field.writeMode(this.start + i, billboard, v)
  }

  release(): void {
    this.setOpacity(0)
    this.field.free(this)
  }
}

/**
 * All world-space typography in ONE instanced draw call. Each glyph is an instance of a unit
 * quad sampling a shared SDF atlas. Labels own contiguous instance ranges; per-frame updates
 * touch a few dozen floats and upload only the attributes that changed.
 *
 * Glyph instances are deliberately "matter": later milestones can scatter, explode and
 * reassemble them (code explosion / UI reconstruction) purely in the vertex shader.
 */
export class GlyphField {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>
  readonly capacity: number
  private readonly anchors: InstancedBufferAttribute
  private readonly glyphs: InstancedBufferAttribute
  private readonly styles: InstancedBufferAttribute
  private readonly modes: InstancedBufferAttribute
  private readonly dirty = new Set<InstancedBufferAttribute>()
  private freeRanges: Array<[number, number]>
  private highWater = 0
  private readonly placeholder: Texture

  constructor(capacity: number, world: WorldUniforms) {
    this.capacity = capacity
    const geometry = new InstancedBufferGeometry()
    const quad = new PlaneGeometry(1, 1)
    geometry.index = quad.index
    geometry.setAttribute('position', quad.getAttribute('position'))
    quad.dispose()

    const make = (size: number) => {
      const attr = new InstancedBufferAttribute(new Float32Array(capacity * size), size)
      attr.setUsage(DynamicDrawUsage)
      return attr
    }
    this.anchors = make(3)
    this.glyphs = make(4)
    this.styles = make(4)
    this.modes = make(2)
    for (let i = 0; i < capacity; i++) this.glyphs.setZ(i, -1)
    geometry.setAttribute('aAnchor', this.anchors)
    geometry.setAttribute('aGlyph', this.glyphs)
    geometry.setAttribute('aStyle', this.styles)
    geometry.setAttribute('aMode', this.modes)
    geometry.instanceCount = 0

    this.placeholder = new DataTexture(new Uint8Array([0]), 1, 1, RedFormat)
    this.placeholder.needsUpdate = true

    const material = new ShaderMaterial({
      uniforms: {
        uTime: world.uTime,
        uAtlas: { value: this.placeholder },
        uGrid: { value: [1, 1] },
        uCellScale: { value: ATLAS_CELL / ATLAS_FONT_PX },
        uAdvance: { value: GLYPH_ADVANCE_EM },
      },
      vertexShader: GLSL.common + vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })

    this.mesh = new Mesh(geometry, material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 10
    this.freeRanges = [[0, capacity]]
  }

  setAtlas(atlas: GlyphAtlas): void {
    const u = this.mesh.material.uniforms
    u.uAtlas.value = atlas.texture
    u.uGrid.value = [atlas.columns, atlas.rows]
  }

  allocate(options: LabelOptions): GlyphLabel {
    const n = options.maxChars
    const index = this.freeRanges.findIndex(([, len]) => len >= n)
    if (index < 0) throw new Error(`GlyphField capacity (${this.capacity}) exhausted`)
    const [start, len] = this.freeRanges[index]
    if (len === n) this.freeRanges.splice(index, 1)
    else this.freeRanges[index] = [start + n, len - n]
    this.highWater = Math.max(this.highWater, start + n)
    this.mesh.geometry.instanceCount = this.highWater
    return new GlyphLabel(this, start, n, options)
  }

  free(label: GlyphLabel): void {
    for (let i = 0; i < label.capacity; i++) this.writeGlyph(label.start + i, 0, 0, -1, 0)
    this.freeRanges.push([label.start, label.capacity])
    this.freeRanges.sort((a, b) => a[0] - b[0])
    // Merge adjacent ranges to avoid fragmentation.
    const merged: Array<[number, number]> = []
    for (const r of this.freeRanges) {
      const last = merged[merged.length - 1]
      if (last && last[0] + last[1] === r[0]) last[1] += r[1]
      else merged.push([r[0], r[1]])
    }
    this.freeRanges = merged
  }

  writeGlyph(i: number, col: number, line: number, glyph: number, size: number): void {
    this.glyphs.setXYZW(i, col, line, glyph, size)
    this.dirty.add(this.glyphs)
  }
  writeAnchor(i: number, x: number, y: number, z: number): void {
    this.anchors.setXYZ(i, x, y, z)
    this.dirty.add(this.anchors)
  }
  writeStyleColor(i: number, r: number, g: number, b: number): void {
    this.styles.setXYZ(i, r, g, b)
    this.dirty.add(this.styles)
  }
  writeOpacity(i: number, a: number): void {
    this.styles.setW(i, a)
    this.dirty.add(this.styles)
  }
  writeMode(i: number, billboard: number, glitch: number): void {
    this.modes.setXY(i, billboard, glitch)
    this.dirty.add(this.modes)
  }

  /** Upload changed attributes. Call once per frame after all labels were written. */
  flush(): void {
    if (this.dirty.size === 0) return
    for (const attr of this.dirty) attr.needsUpdate = true
    this.dirty.clear()
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
    this.placeholder.dispose()
  }
}
