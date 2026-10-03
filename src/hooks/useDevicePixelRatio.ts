import { useEffect, useState } from 'react'

/** Live devicePixelRatio (changes when a window moves between monitors or the page is zoomed). */
export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(() => window.devicePixelRatio || 1)
  useEffect(() => {
    let mq: MediaQueryList | null = null
    const listen = () => {
      const current = window.devicePixelRatio || 1
      setDpr(current)
      mq = window.matchMedia(`(resolution: ${current}dppx)`)
      mq.addEventListener('change', onChange, { once: true })
    }
    const onChange = () => listen()
    listen()
    return () => mq?.removeEventListener('change', onChange)
  }, [])
  return dpr
}
