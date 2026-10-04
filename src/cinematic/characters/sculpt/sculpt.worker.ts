/// <reference lib="webworker" />
import type { QualityTier } from '../../types'
import { FIGHTER_KITS } from '../designs'
import { generateCharacterArrays, transferables } from './generate'

/** Generates fighter geometry off the main thread. Message: { id, tier } → { id, tier, arrays }. */
self.onmessage = (e: MessageEvent<{ id: 'aeron' | 'nox'; tier: QualityTier }>) => {
  const { id, tier } = e.data
  try {
    const arrays = generateCharacterArrays(FIGHTER_KITS[id].design, tier)
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, tier, arrays }, transferables(arrays))
  } catch (err) {
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, tier, error: String(err) })
  }
}
