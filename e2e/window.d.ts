// Minimal shape of the ?debug / ?review handle (src/app/providers/debugHandle.ts) as seen from tests.
interface Window {
  __VOIDSHIFT__?: {
    renderer: unknown
    engine: {
      duration: number
      time: number
      timeScale: number
      isComplete: boolean
      phase: string
      layout: string
      motion: { reduced: boolean }
      cues: ReadonlyArray<{ name: string; time: number }>
      scenes: ReadonlyArray<{ id: string; label: string; time: number }>
      shots: ReadonlyArray<{ name: string; time: number }>
      scene: { id: string; label: string; time: number } | null
      shot: { name: string; time: number } | null
      seekScene(id: string): boolean
      replay(): void
    }
    seek(time: number): void
    pause(): void
    play(): void
    setFixedDelta(dt: number | null): void
    stats(): { calls: number; triangles: number; geometries: number; textures: number; programs: number; tier: string; dpr: number }
    drawBreakdown(): Record<string, number>
  }
}
