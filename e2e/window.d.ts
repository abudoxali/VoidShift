// Minimal shape of the ?debug handle (src/app/providers/debugHandle.ts) as seen from tests.
interface Window {
  __VOIDSHIFT__?: {
    renderer: unknown
    engine: {
      duration: number
      time: number
      isComplete: boolean
      motion: { reduced: boolean }
      cues: ReadonlyArray<{ name: string; time: number }>
      replay(): void
    }
    seek(time: number): void
    pause(): void
    play(): void
    setFixedDelta(dt: number | null): void
    stats(): { calls: number; triangles: number; geometries: number; textures: number; programs: number; tier: string; dpr: number }
  }
}
