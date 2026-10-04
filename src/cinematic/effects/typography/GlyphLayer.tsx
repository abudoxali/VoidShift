import { useFrame } from '@react-three/fiber'
import { createContext, use, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { FRAME_STAGE } from '../../engine/frameStages'
import { useExperience } from '../../../store/experienceStore'
import { useWorld } from '../../scenes/WorldContext'
import { GlyphField, type GlyphLabel, type LabelOptions } from './GlyphField'
import { createGlyphAtlas } from './glyphAtlas'

const GLYPH_CAPACITY = 640
const GlyphContext = createContext<GlyphField | null>(null)

/** Owns the single typography draw call and flushes label writes once per frame. */
export function GlyphLayer({ children }: { children: ReactNode }) {
  const { uniforms } = useWorld()
  const [field] = useState(() => new GlyphField(GLYPH_CAPACITY, uniforms))

  useEffect(() => {
    let cancelled = false
    let dispose: (() => void) | undefined
    createGlyphAtlas()
      .then((atlas) => {
        if (cancelled) {
          atlas.texture.dispose()
          return
        }
        field.setAtlas(atlas)
        dispose = () => atlas.texture.dispose()
      })
      .catch((error: unknown) => console.warn('[VoidShift] glyph atlas unavailable', error))
    return () => {
      cancelled = true
      dispose?.()
    }
  }, [field])

  useEffect(() => () => field.dispose(), [field])

  useFrame(() => {
    field.mesh.visible = useExperience.getState().fx === 'full'
    field.flush()
  }, FRAME_STAGE.LATE)

  return (
    <GlyphContext value={field}>
      <primitive name="glyphs" object={field.mesh} />
      {children}
    </GlyphContext>
  )
}

/** The shared SDF atlas uniforms, for other systems that draw glyphs as matter (debris). */
export function useGlyphAtlasUniforms() {
  const field = use(GlyphContext)
  if (!field) throw new Error('useGlyphAtlasUniforms must be used inside <GlyphLayer>')
  const u = field.mesh.material.uniforms
  return { uAtlas: u.uAtlas, uGrid: u.uGrid, uCellScale: u.uCellScale }
}

/**
 * Reserves a label for the lifetime of the calling component. Read `ref.current` inside
 * `useFrame` (it is null until mounted).
 */
export function useGlyphLabel(options: LabelOptions): RefObject<GlyphLabel | null> {
  const field = use(GlyphContext)
  if (!field) throw new Error('useGlyphLabel must be used inside <GlyphLayer>')
  const ref = useRef<GlyphLabel | null>(null)
  const optionsRef = useRef(options)
  useEffect(() => {
    const label = field.allocate(optionsRef.current)
    ref.current = label
    return () => {
      label.release()
      ref.current = null
    }
  }, [field])
  return ref
}
