import { describe, expect, it } from 'vitest'
import { CHARSET, corruptText, formatCoord, glyphIndex, scrambleText } from './glyphs'

describe('glyph encoding', () => {
  it('maps every charset entry and falls back to "?"', () => {
    ;[...CHARSET].forEach((c, i) => expect(glyphIndex(c)).toBe(i))
    expect(glyphIndex('x')).toBe(glyphIndex('X'))
    expect(glyphIndex('€')).toBe(glyphIndex('?'))
  })
})

describe('formatCoord', () => {
  it('produces fixed-width signed coordinates', () => {
    expect(formatCoord(18.4249)).toBe('+18.42')
    expect(formatCoord(-7.183)).toBe('-07.18')
    expect(formatCoord(0)).toBe('+00.00')
    expect(formatCoord(-0.001)).toBe('+00.00')
    expect(formatCoord(3.91, 2, 1)).toBe('+03.9')
  })
})

describe('scrambleText', () => {
  it('is deterministic and resolves fully', () => {
    expect(scrambleText('VELOCITY', 0.3, 1, 5)).toBe(scrambleText('VELOCITY', 0.3, 1, 5))
    expect(scrambleText('VELOCITY', 1, 1, 5)).toBe('VELOCITY')
    expect(scrambleText('VELOCITY', 0.5, 1, 5).length).toBe(8)
    expect(scrambleText('VELOCITY', 0.5, 1, 5).startsWith('VEL')).toBe(true)
  })
  it('preserves spaces', () => {
    expect(scrambleText('X Y', 0, 3, 1)[1]).toBe(' ')
  })
})

describe('corruptText', () => {
  it('is identity at zero and changes text at full corruption', () => {
    expect(corruptText('X +03.40', 0, 1, 1)).toBe('X +03.40')
    expect(corruptText('X +03.40', 1, 1, 1)).not.toBe('X +03.40')
  })
})
