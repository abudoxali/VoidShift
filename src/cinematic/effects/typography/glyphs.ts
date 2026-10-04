/**
 * The data alphabet. Deliberately small: VoidShift typography is coordinates, vectors and a
 * handful of system words — never paragraphs.
 */
export const CHARSET = ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.:-+/_#%?<>[]|=*ΔΣ∅·→{}λ'

const INDEX = new Map<string, number>([...CHARSET].map((c, i) => [c, i]))
const FALLBACK = INDEX.get('?')!
export const SPACE_GLYPH = 0

/** Glyphs used when data is scrambling / corrupted. */
const NOISE_POOL = '0123456789ABCDEFX#%?/<>[]=*+-'

export function glyphIndex(char: string): number {
  return INDEX.get(char) ?? INDEX.get(char.toUpperCase()) ?? FALLBACK
}

/** Zero-padded signed fixed-width coordinate, e.g. -7.183 → "-07.18". */
export function formatCoord(value: number, intDigits = 2, decimals = 2): string {
  const v = Object.is(value, -0) ? 0 : value
  const rounded = Number(Math.abs(v).toFixed(decimals))
  const sign = v < 0 && rounded !== 0 ? '-' : '+'
  const [int, frac] = rounded.toFixed(decimals).split('.')
  return `${sign}${int.padStart(intDigits, '0')}${decimals > 0 ? '.' + frac : ''}`
}

function hash(n: number): number {
  const s = Math.sin(n * 91.3458 + 47.123) * 43758.5453
  return s - Math.floor(s)
}

/**
 * Deterministic decode effect: characters resolve left→right as `progress` goes 0→1;
 * unresolved characters cycle through noise glyphs that change every `step`.
 */
export function scrambleText(target: string, progress: number, seed: number, step: number): string {
  if (progress >= 1) return target
  const resolved = Math.floor(Math.max(0, progress) * (target.length + 1))
  let out = ''
  for (let i = 0; i < target.length; i++) {
    const c = target[i]
    if (i < resolved || c === ' ') out += c
    else out += NOISE_POOL[Math.floor(hash(seed * 13.7 + i * 7.1 + step * 3.3) * NOISE_POOL.length)]
  }
  return out
}

/**
 * Corrupts a fraction of characters (used by the VOID: its coordinates never resolve).
 */
export function corruptText(source: string, amount: number, seed: number, step: number): string {
  if (amount <= 0) return source
  let out = ''
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    out += c !== ' ' && hash(seed + i * 3.7 + step * 1.9) < amount ? NOISE_POOL[Math.floor(hash(seed * 2.1 + i + step) * NOISE_POOL.length)] : c
  }
  return out
}
