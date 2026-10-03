import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RedFormat, UnsignedByteType } from 'three'
import { CHARSET } from './glyphs'
import { coverageToSdf } from './sdf'

export const ATLAS_CELL = 64
export const ATLAS_FONT_PX = 40
export const ATLAS_SPREAD = 8
export const ATLAS_COLUMNS = 8
/** JetBrains Mono advance width in em. */
export const GLYPH_ADVANCE_EM = 0.6
export const FONT_FAMILY = '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'

export interface GlyphAtlas {
  texture: DataTexture
  columns: number
  rows: number
}

async function waitForFont(): Promise<void> {
  if (!('fonts' in document)) return
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1500))
  await Promise.race([document.fonts.load(`500 ${ATLAS_FONT_PX}px "JetBrains Mono"`, CHARSET).then(() => undefined), timeout])
}

/**
 * Rasterises the data alphabet once and converts it to a single-channel SDF texture
 * (512×512 R8 = 256 KB). Runs in ~10 ms on the main thread at startup.
 */
export async function createGlyphAtlas(): Promise<GlyphAtlas> {
  await waitForFont()
  const chars = [...CHARSET]
  const columns = ATLAS_COLUMNS
  const rows = Math.ceil(chars.length / columns)
  const width = columns * ATLAS_CELL
  const height = rows * ATLAS_CELL

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2D canvas unavailable for glyph atlas')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#fff'
  ctx.font = `500 ${ATLAS_FONT_PX}px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  chars.forEach((c, i) => {
    const x = (i % columns) * ATLAS_CELL + ATLAS_CELL / 2
    const y = Math.floor(i / columns) * ATLAS_CELL + ATLAS_CELL / 2 + 2
    ctx.fillText(c, x, y)
  })

  const rgba = ctx.getImageData(0, 0, width, height).data
  const coverage = new Uint8Array(width * height)
  for (let i = 0; i < coverage.length; i++) coverage[i] = rgba[i * 4]
  const sdf = coverageToSdf(coverage, width, height, ATLAS_SPREAD)

  // DataTexture rows are bottom-up in UV space; flip so row 0 of the canvas maps to v = 1.
  const flipped = new Uint8Array(sdf.length)
  for (let y = 0; y < height; y++) flipped.set(sdf.subarray(y * width, (y + 1) * width), (height - 1 - y) * width)

  const texture = new DataTexture(flipped, width, height, RedFormat, UnsignedByteType)
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = true
  texture.unpackAlignment = 1
  texture.needsUpdate = true
  return { texture, columns, rows }
}
