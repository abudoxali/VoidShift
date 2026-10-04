import { useEffect, useState, type ReactNode } from 'react'
import { AudioDirector } from '../../cinematic/audio/AudioDirector'
import { CinematicContext } from '../../cinematic/engine/CinematicContext'
import { CinematicEngine } from '../../cinematic/engine/CinematicEngine'
import { INTRO_SEQUENCE } from '../../cinematic/sequences/intro'
import { CHARACTER_SHEET } from '../../cinematic/sequences/sheet'
import { FULL_MOTION, REDUCED_MOTION, layoutForAspect } from '../../cinematic/types'
import { selectReducedMotion, useExperience } from '../../store/experienceStore'
import { exposeDebugHandle } from './debugHandle'

/**
 * Owns the single CinematicEngine for the app (shared by the WebGL scene and the DOM UI)
 * and keeps the UI store, accessibility preferences and audio in sync with it.
 */
export function CinematicProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(
    () =>
      new CinematicEngine({
        sequence: new URLSearchParams(window.location.search).get('sheet') === 'characters' ? CHARACTER_SHEET : INTRO_SEQUENCE,
        motion: selectReducedMotion(useExperience.getState()) ? REDUCED_MOTION : FULL_MOTION,
        layout: layoutForAspect(window.innerWidth / Math.max(window.innerHeight, 1)),
      }),
  )
  const [audio] = useState(() => new AudioDirector())
  const reduced = useExperience(selectReducedMotion)
  const soundEnabled = useExperience((s) => s.soundEnabled)
  const debug = useExperience((s) => s.debug)

  // Engine → UI store (phase boundaries only; never per frame).
  useEffect(() => {
    const { setPhase, setIntroComplete } = useExperience.getState()
    const sync = () => {
      setPhase(engine.phase)
      setIntroComplete(engine.isComplete)
    }
    sync()
    const offs = [engine.on('phase', sync), engine.on('complete', sync), engine.on('seek', sync)]
    return () => offs.forEach((off) => off())
  }, [engine])

  // prefers-reduced-motion, live.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const onChange = () => useExperience.getState().setSystemReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => engine.setMotion(reduced ? REDUCED_MOTION : FULL_MOTION), [engine, reduced])

  // Orientation: portrait screens get their own compiled shot variants (rebuild only on change).
  useEffect(() => {
    const onResize = () => engine.setLayout(layoutForAspect(window.innerWidth / Math.max(window.innerHeight, 1)))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [engine])

  // Audio follows cues and the toggle.
  useEffect(() => {
    const offCue = engine.on('cue', (cue) => audio.handleCue(cue))
    const offFrame = engine.on('frame', (e) => audio.sync(e))
    return () => {
      offCue()
      offFrame()
    }
  }, [engine, audio])
  useEffect(() => {
    if (soundEnabled) void audio.enable()
    else audio.disable()
  }, [audio, soundEnabled])
  useEffect(() => () => audio.dispose(), [audio])

  // Pause the clock when the tab is hidden so the choreography never runs unseen.
  useEffect(() => {
    const onVisibility = () => (document.hidden ? engine.pause() : engine.play())
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [engine])

  const review = useExperience((s) => s.review)
  useEffect(() => (debug || review ? exposeDebugHandle(engine) : undefined), [engine, debug, review])

  // Scene jump (?scene=<id>): lands on a scene through the deterministic timeline.
  useEffect(() => {
    const scene = new URLSearchParams(window.location.search).get('scene')
    if (scene) engine.seekScene(scene)
  }, [engine])

  return <CinematicContext value={engine}>{children}</CinematicContext>
}
