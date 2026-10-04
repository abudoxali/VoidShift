import { mkdirSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { it } from 'vitest'
import { FIGHTER_KITS } from '../src/cinematic/characters/designs'
import { designSignature, encodeCharacter } from '../src/cinematic/characters/sculpt/bake'
import { generateCharacterArrays } from '../src/cinematic/characters/sculpt/generate'
import type { QualityTier } from '../src/cinematic/types'

/**
 * Bakes the sculpted fighters (npm run bake): public/characters/<id>-<tier>.bin.gz. The runtime
 * loads these instead of generating; a stale file (design edited) is detected by its signature.
 * Select with BAKE=aeron:high,nox:lite (default: every fighter at HIGH and LITE).
 */
const targets = (process.env.BAKE ?? 'aeron:high,aeron:lite,nox:high,nox:lite').split(',').map((t) => t.split(':') as ['aeron' | 'nox', string])

for (const [id, tierName] of targets) {
  it(`bake ${id} ${tierName}`, () => {
    const tier = tierName.toUpperCase() as QualityTier
    const design = FIGHTER_KITS[id].design
    const arrays = generateCharacterArrays(design, tier)
    const bin = gzipSync(encodeCharacter(arrays, designSignature(design, tier)), { level: 9 })
    mkdirSync('public/characters', { recursive: true })
    writeFileSync(`public/characters/${id}-${tier.toLowerCase()}.bin.gz`, bin)
    console.info(`${id} ${tier}: ${arrays.stats.triangles} tris, ${(bin.byteLength / 1024).toFixed(0)} KB, ${(arrays.stats.ms / 1000).toFixed(1)} s`)
  })
}
