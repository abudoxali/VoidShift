import { useEffect, useRef } from 'react'
import { useCinematicEngine } from '../../cinematic/engine/CinematicContext'

const pad = (n: number, w: number) => String(n).padStart(w, '0')

/** Sequence timecode, written straight to the DOM from the engine frame event (no React renders). */
export function Timecode() {
  const engine = useCinematicEngine()
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let last = ''
    return engine.on('frame', (e) => {
      const t = e.time
      const text = `T+${pad(Math.floor(t / 60), 2)}:${pad(Math.floor(t % 60), 2)}.${pad(Math.floor((t % 1) * 100), 2)}`
      if (text !== last && ref.current) {
        ref.current.textContent = text
        last = text
      }
    })
  }, [engine])
  return (
    <span ref={ref} className="hud__timecode" aria-hidden="true">
      T+00:00.00
    </span>
  )
}
