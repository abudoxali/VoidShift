import { useEffect, useState } from 'react'
import type { QualityTier } from '../../types'
import { FIGHTER_KITS } from '../designs'
import { decodeCharacter, designSignature } from './bake'
import { cachedGeometry, storeGeometry, toCharacterGeometry, type CharacterArrays, type CharacterGeometry } from './generate'

type FighterId = 'aeron' | 'nox'

const pending = new Map<string, Promise<CharacterGeometry>>()
let worker: Worker | null = null
const waiters = new Map<string, { resolve: (a: CharacterArrays) => void; reject: (e: Error) => void }>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./sculpt.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<{ id: FighterId; tier: QualityTier; arrays?: CharacterArrays; error?: string }>) => {
    const key = `${e.data.id}:${e.data.tier}`
    const w = waiters.get(key)
    waiters.delete(key)
    if (!w) return
    if (e.data.error || !e.data.arrays) w.reject(new Error(e.data.error ?? 'sculpt worker failed'))
    else w.resolve(e.data.arrays)
  }
  return worker
}

function generateInWorker(id: FighterId, tier: QualityTier): Promise<CharacterArrays> {
  return new Promise((resolve, reject) => {
    waiters.set(`${id}:${tier}`, { resolve, reject })
    getWorker().postMessage({ id, tier })
  })
}

/** The baked file for this fighter/tier, if present and built from the current design. */
async function loadBaked(id: FighterId, tier: QualityTier): Promise<CharacterArrays | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}characters/${id}-${tier.toLowerCase()}.bin.gz`)
    if (!res.ok) return null
    // Some servers (the Vite dev server) send .gz with Content-Encoding and the browser has
    // already inflated it; static hosts send the raw gzip. Detect by the gzip magic bytes.
    let buffer = await res.arrayBuffer()
    const head = new Uint8Array(buffer, 0, 2)
    if (head[0] === 0x1f && head[1] === 0x8b) buffer = await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    const { signature, arrays } = decodeCharacter(buffer)
    if (signature !== designSignature(FIGHTER_KITS[id].design, tier)) {
      console.info(`VoidShift: baked ${id}/${tier} is stale (design changed); regenerating`)
      return null
    }
    return arrays
  } catch {
    return null
  }
}

/** Loads a fighter's sculpted geometry: memory cache → baked file → worker generation. */
export function loadCharacterGeometry(id: FighterId, tier: QualityTier): Promise<CharacterGeometry> {
  const hit = cachedGeometry(id, tier)
  if (hit) return Promise.resolve(hit)
  const key = `${id}:${tier}`
  const running = pending.get(key)
  if (running) return running
  const p = (async () => {
    const arrays = (await loadBaked(id, tier)) ?? (await generateInWorker(id, tier))
    const geo = toCharacterGeometry(arrays)
    storeGeometry(id, tier, geo)
    return geo
  })()
  pending.set(key, p)
  p.finally(() => pending.delete(key)).catch(() => undefined)
  return p
}

/** React hook: the fighter's geometry once ready (null while loading). */
export function useCharacterGeometry(id: FighterId, tier: QualityTier): CharacterGeometry | null {
  const [geo, setGeo] = useState<CharacterGeometry | null>(() => cachedGeometry(id, tier) ?? null)
  useEffect(() => {
    let alive = true
    loadCharacterGeometry(id, tier).then((g) => alive && setGeo(g), (err) => console.error(err))
    return () => void (alive = false)
  }, [id, tier])
  return geo && cachedGeometry(id, tier) === geo ? geo : null
}
