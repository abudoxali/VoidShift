import type { WebGLRenderer } from 'three'
import type { CinematicEngine } from '../../cinematic/engine/CinematicEngine'
import { snapshotState } from '../../cinematic/engine/CinematicState'
import { useExperience } from '../../store/experienceStore'
import { lastFrameStats } from '../../utils/renderStats'

export interface VoidShiftDebugHandle {
  engine: CinematicEngine
  renderer: WebGLRenderer | null
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

export function attachRendererToDebugHandle(renderer: WebGLRenderer): void {
  if (window.__VOIDSHIFT__) window.__VOIDSHIFT__.renderer = renderer
}
