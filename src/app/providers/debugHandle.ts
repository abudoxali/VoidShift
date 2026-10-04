import type { Object3D, Scene, WebGLRenderer } from 'three'
import type { CinematicEngine } from '../../cinematic/engine/CinematicEngine'
import { snapshotState } from '../../cinematic/engine/CinematicState'
import { useExperience } from '../../store/experienceStore'
import { lastFrameStats } from '../../utils/renderStats'

export interface VoidShiftDebugHandle {
  engine: CinematicEngine
  renderer: WebGLRenderer | null
  scene: Scene | null
  /** Visible renderables per named subsystem (approximate draw-call sources; post passes excluded). */
  drawBreakdown(): Record<string, number>
  /** Both fighters' sculpted geometry is loaded (the clock is held until then). */
  ready(): boolean
  seek(time: number): void
  pause(): void
  play(): void
  /** Deterministic stepping for captures: every rendered frame advances exactly `dt`. */
  setFixedDelta(dt: number | null): void
  snapshot(): Record<string, unknown>
  stats(): { calls: number; triangles: number; points: number; lines: number; geometries: number; textures: number; programs: number; tier: string; dpr: number }
}

declare global {
  interface Window {
    __VOIDSHIFT__?: VoidShiftDebugHandle
  }
}

/** Only installed with ?debug — used by the e2e verification suite and manual profiling. */
export function exposeDebugHandle(engine: CinematicEngine): () => void {
  const handle: VoidShiftDebugHandle = {
    engine,
    renderer: null,
    scene: null,
    drawBreakdown: () => (handle.scene ? breakdown(handle.scene) : {}),
    ready: () => useExperience.getState().charactersReady,
    seek: (t) => engine.seek(t),
    pause: () => engine.pause(),
    play: () => engine.play(),
    setFixedDelta: (dt) => (engine.fixedDelta = dt),
    snapshot: () => snapshotState(engine.state),
    stats: () => {
      const info = handle.renderer?.info
      return {
        ...lastFrameStats,
        geometries: info?.memory.geometries ?? 0,
        textures: info?.memory.textures ?? 0,
        programs: info?.programs?.length ?? 0,
        tier: useExperience.getState().quality.tier,
        dpr: handle.renderer?.getPixelRatio() ?? 0,
      }
    },
  }
  window.__VOIDSHIFT__ = handle
  return () => {
    if (window.__VOIDSHIFT__ === handle) delete window.__VOIDSHIFT__
  }
}

export function attachRendererToDebugHandle(renderer: WebGLRenderer, scene: Scene): void {
  if (window.__VOIDSHIFT__) {
    window.__VOIDSHIFT__.renderer = renderer
    window.__VOIDSHIFT__.scene = scene
  }
}

function breakdown(scene: Scene): Record<string, number> {
  const out: Record<string, number> = {}
  const visit = (o: Object3D, label: string) => {
    if (!o.visible) return
    const name = o.name || label
    const r = o as Object3D & { isMesh?: boolean; isLine?: boolean; isPoints?: boolean; material?: { visible?: boolean } | Array<{ visible?: boolean }> }
    if ((r.isMesh || r.isLine || r.isPoints) && r.material && !Array.isArray(r.material) && r.material.visible !== false) out[name] = (out[name] ?? 0) + 1
    for (const c of o.children) visit(c, name)
  }
  visit(scene, 'scene')
  return out
}
