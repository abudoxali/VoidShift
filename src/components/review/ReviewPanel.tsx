import { useEffect, useState } from 'react'
import { useCinematicEngine } from '../../cinematic/engine/CinematicContext'
import { TIER_ORDER } from '../../cinematic/engine/PerformanceManager'
import type { QualityTier } from '../../cinematic/types'
import { useExperience } from '../../store/experienceStore'

/**
 * Developer review panel (?review=1). Never rendered for normal visitors. Drives the same
 * deterministic engine the intro uses: play / pause, restart, previous / next shot (camera
 * cuts), a scrubber, scene jumps, FX on/off, camera and skeleton debug, slow motion, quality.
 */
export function ReviewPanel() {
  const engine = useCinematicEngine()
  const fx = useExperience((s) => s.fx)
  const skeletonDebug = useExperience((s) => s.skeletonDebug)
  const cameraDebug = useExperience((s) => s.cameraDebug)
  const slowMotion = useExperience((s) => s.slowMotion)
  const quality = useExperience((s) => s.quality)
  const [, setTick] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Re-render ~12×/s for the time, scene and shot readouts (UI only; not per frame).
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 80)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    engine.setTimeScale(slowMotion ? 0.25 : 1)
  }, [engine, slowMotion])

  const shots = engine.shots
  const now = engine.time
  const shotIndex = Math.max(0, shots.findIndex((s, i) => s.time <= now + 1e-6 && (i === shots.length - 1 || shots[i + 1].time > now + 1e-6)))
  const goShot = (i: number) => {
    const s = shots[Math.min(Math.max(i, 0), shots.length - 1)]
    if (s) engine.seek(s.time + 1e-4)
  }
  const set = useExperience.getState().setReview

  // Collapsed: a small pill, so the panel never has to cover the frame being reviewed (phones).
  if (collapsed)
    return (
      <aside className="review review--collapsed" aria-label="Review controls">
        <button type="button" onClick={() => setCollapsed(false)} aria-expanded={false}>
          Review · {now.toFixed(2)}s · {engine.shot?.name ?? '—'}
        </button>
      </aside>
    )

  return (
    <aside className="review" aria-label="Review controls">
      <div className="review__row review__readout">
        <span className="review__time">{now.toFixed(2)}s / {engine.duration.toFixed(1)}s</span>
        <span className="review__scene">{engine.scene?.label ?? '—'}</span>
        <span className="review__shot">{engine.shot?.name ?? '—'}</span>
        <button type="button" className="review__hide" onClick={() => setCollapsed(true)} aria-expanded={true} aria-label="Hide review panel">
          ▾
        </button>
      </div>
      <input
        className="review__scrub"
        type="range"
        min={0}
        max={engine.duration}
        step={0.01}
        value={now}
        aria-label="Timeline"
        onPointerDown={() => {
          setScrubbing(true)
          engine.pause()
        }}
        onPointerUp={() => setScrubbing(false)}
        onChange={(e) => engine.seek(Number(e.currentTarget.value))}
        data-scrubbing={scrubbing || undefined}
      />
      <div className="review__row">
        <button type="button" onClick={() => (engine.playing ? engine.pause() : engine.play())} aria-pressed={engine.playing}>
          {engine.playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => engine.replay()}>
          Restart
        </button>
        <button type="button" onClick={() => goShot(shotIndex - 1)} aria-label="Previous shot">
          ◀ Shot
        </button>
        <button type="button" onClick={() => goShot(shotIndex + 1)} aria-label="Next shot">
          Shot ▶
        </button>
      </div>
      <div className="review__row">
        <select aria-label="Scene" value={engine.scene?.id ?? ''} onChange={(e) => engine.seekScene(e.currentTarget.value)}>
          {engine.scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="review__row">
        <button type="button" aria-pressed={fx === 'full'} onClick={() => set({ fx: fx === 'full' ? 'off' : 'full' })}>
          FX {fx === 'full' ? 'full' : 'off'}
        </button>
        <button type="button" aria-pressed={cameraDebug} onClick={() => set({ cameraDebug: !cameraDebug })}>
          Camera debug
        </button>
        <button type="button" aria-pressed={skeletonDebug} onClick={() => set({ skeletonDebug: !skeletonDebug })}>
          Skeleton
        </button>
        <button type="button" aria-pressed={slowMotion} onClick={() => set({ slowMotion: !slowMotion })}>
          Slow ×0.25
        </button>
        <select aria-label="Quality" value={quality.tier} onChange={(e) => useExperience.getState().setQuality(e.currentTarget.value as QualityTier, 'user')}>
          {TIER_ORDER.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </aside>
  )
}

/** Camera debug overlay: thirds, the letterbox-safe frame, and the shot's framing contract. */
export function CameraDebugOverlay() {
  const engine = useCinematicEngine()
  const enabled = useExperience((s) => s.cameraDebug)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setTick((n) => n + 1), 120)
    return () => window.clearInterval(id)
  }, [enabled])
  if (!enabled) return null
  const cam = engine.state.camera
  return (
    <div className="camdebug" aria-hidden="true">
      <div className="camdebug__thirds" />
      <div className="camdebug__label">
        {engine.shot?.name ?? '—'} · fov {cam.fov.toFixed(0)} · pos {cam.position.x.toFixed(2)}, {cam.position.y.toFixed(2)}, {cam.position.z.toFixed(2)} · target {cam.target.x.toFixed(2)}, {cam.target.y.toFixed(2)}, {cam.target.z.toFixed(2)}
      </div>
    </div>
  )
}
