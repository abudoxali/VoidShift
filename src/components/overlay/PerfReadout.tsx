import { useEffect, useRef } from 'react'
import { useCinematicEngine } from '../../cinematic/engine/CinematicContext'

/** ?debug only: frame time and renderer counters, written directly to the DOM twice a second. */
export function PerfReadout() {
  const engine = useCinematicEngine()
  const ref = useRef<HTMLPreElement>(null)
  useEffect(() => {
    let frames = 0
    let acc = 0
    let worst = 0
    let lastWall = performance.now()
    return engine.on('frame', () => {
      const now = performance.now()
      const dt = now - lastWall
      lastWall = now
      frames++
      acc += dt
      worst = Math.max(worst, dt)
      if (acc < 500) return
      const s = window.__VOIDSHIFT__?.stats()
      if (ref.current && s) {
        ref.current.textContent =
          `fps ${((frames * 1000) / acc).toFixed(1)}  worst ${worst.toFixed(1)}ms\n` +
          `calls ${s.calls}  tris ${s.triangles}  pts ${s.points}  lines ${s.lines}\n` +
          `geo ${s.geometries}  tex ${s.textures}  prg ${s.programs}  ${s.tier} @${s.dpr.toFixed(2)}x`
      }
      frames = 0
      acc = 0
      worst = 0
    })
  }, [engine])
  return <pre ref={ref} className="perf" aria-hidden="true" />
}
