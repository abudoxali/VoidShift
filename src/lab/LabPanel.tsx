import { FIGHTER_KITS } from '../cinematic/characters/designs'
import { EXPRESSIONS, type ExpressionName } from '../cinematic/characters/sculpt/expressions'
import { TIER_ORDER } from '../cinematic/engine/PerformanceManager'
import type { QualityTier } from '../cinematic/types'
import { useLab, type LabLight, type LabView } from './labStore'

const VIEWS: LabView[] = ['front', 'three-quarter', 'side', 'back', 'face', 'face-34', 'hands']
const LIGHTS: LabLight[] = ['studio', 'arena', 'standoff', 'core', 'flat']

/** Lab controls (DOM). Development only: rendered behind ?review=1&lab=…. */
export function LabPanel() {
  const s = useLab()
  const kit = FIGHTER_KITS[s.fighter]
  const toggle = (key: 'wireframe' | 'skeleton' | 'turntable') => (
    <button type="button" aria-pressed={s[key]} onClick={() => s.set({ [key]: !s[key] })}>
      {key}
    </button>
  )
  return (
    <aside className="review lab__panel" aria-label="Character lab">
      <div className="review__row review__readout">
        <span className="review__scene">Character lab</span>
        <span className="review__shot">
          {(s.stats.triangles / 1000).toFixed(0)}k tris · {s.stats.ms.toFixed(0)} ms · {s.stats.calls} calls
        </span>
      </div>
      <div className="review__row">
        {(['aeron', 'nox'] as const).map((f) => (
          <button key={f} type="button" aria-pressed={s.fighter === f} onClick={() => s.set({ fighter: f, pose: f === 'nox' ? 'stand' : 'stand', expression: f === 'nox' ? 'threat' : 'neutral' })}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="review__row review__scenes">
        {VIEWS.map((v) => (
          <button key={v} type="button" aria-pressed={s.view === v} onClick={() => s.set({ view: v })}>
            {v}
          </button>
        ))}
      </div>
      <div className="review__row">
        <label>
          Pose{' '}
          <select value={s.pose} onChange={(e) => s.set({ pose: e.target.value })}>
            {Object.keys(kit.poses).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Face{' '}
          <select value={s.expression} onChange={(e) => s.set({ expression: e.target.value as ExpressionName })}>
            {Object.keys(EXPRESSIONS).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="review__row review__scenes">
        {LIGHTS.map((l) => (
          <button key={l} type="button" aria-pressed={s.light === l} onClick={() => s.set({ light: l })}>
            {l}
          </button>
        ))}
      </div>
      <div className="review__row">
        {toggle('wireframe')}
        {toggle('skeleton')}
        {toggle('turntable')}
        <select aria-label="Mesh quality" value={s.tier} onChange={(e) => s.set({ tier: e.target.value as QualityTier })}>
          {[...TIER_ORDER].reverse().map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
    </aside>
  )
}
