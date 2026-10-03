import type { WebGLRenderer } from 'three'
import { AudioDirector } from '../../cinematic/audio/AudioDirector'
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
  /** Offline render of the procedural score for the current sequence (base64 16-bit WAV). */
  renderAudio(): Promise<string>
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
    renderAudio: async () => encodeWav(await AudioDirector.renderOffline(engine.sequence, engine.motion)),
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

/** 16-bit PCM WAV, base64 (debug export only). */
function encodeWav(buffer: AudioBuffer): string {
  const channels = buffer.numberOfChannels
  const frames = buffer.length
  const bytes = new DataView(new ArrayBuffer(44 + frames * channels * 2))
  const str = (o: number, v: string) => [...v].forEach((c, i) => bytes.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  bytes.setUint32(4, 36 + frames * channels * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  bytes.setUint32(16, 16, true)
  bytes.setUint16(20, 1, true)
  bytes.setUint16(22, channels, true)
  bytes.setUint32(24, buffer.sampleRate, true)
  bytes.setUint32(28, buffer.sampleRate * channels * 2, true)
  bytes.setUint16(32, channels * 2, true)
  bytes.setUint16(34, 16, true)
  str(36, 'data')
  bytes.setUint32(40, frames * channels * 2, true)
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c))
  let o = 44
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const v = Math.max(-1, Math.min(1, data[c][i]))
      bytes.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true)
      o += 2
    }
  }
  let binary = ''
  const u8 = new Uint8Array(bytes.buffer)
  for (let i = 0; i < u8.length; i += 0x8000) binary += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return btoa(binary)
}
