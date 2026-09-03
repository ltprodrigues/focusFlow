import { describe, expect, it } from 'vitest'
import { buildConicGradient } from './chart'

describe('buildConicGradient', () => {
  it('uses category proportions and the fixed default-category colors', () => {
    expect(buildConicGradient([
      { category: 'Food', amount: 75 },
      { category: 'School', amount: 25 },
    ], 100)).toBe('conic-gradient(#e4a070 0% 75%, #7fb17b 75% 100%)')
  })

  it('uses stable colors for every default category', () => {
    expect(buildConicGradient([
      { category: 'Transport', amount: 1 },
      { category: 'Entertainment', amount: 1 },
      { category: 'Housing', amount: 1 },
      { category: 'Other', amount: 1 },
    ], 4)).toBe('conic-gradient(#6f9fba 0% 25%, #b28db8 25% 50%, #d0aa58 50% 75%, #9c9c92 75% 100%)')
  })

  it('uses the neutral fallback for custom and differently-cased categories', () => {
    expect(buildConicGradient([
      { category: 'Medical', amount: 30 },
      { category: 'food', amount: 70 },
    ], 100)).toBe('conic-gradient(#b8b8ad 0% 30%, #b8b8ad 30% 100%)')
  })

  it.each([
    [[], 0],
    [[{ category: 'Food', amount: 0 }], 0],
    [[{ category: 'Food', amount: 10 }], -1],
  ])('returns a neutral empty chart for zero or invalid totals', (categories, total) => {
    expect(buildConicGradient(categories, total)).toBe('conic-gradient(#e8e8df 0% 100%)')
  })

  it('ignores nonpositive entries and clamps decimal rounding at 100 percent', () => {
    expect(buildConicGradient([
      { category: 'Food', amount: 1 },
      { category: 'School', amount: 2 },
      { category: 'Other', amount: 0 },
      { category: 'Housing', amount: -5 },
    ], 3)).toBe('conic-gradient(#e4a070 0% 33.3333%, #7fb17b 33.3333% 100%)')
  })
})
