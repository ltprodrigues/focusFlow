import { describe, expect, it } from 'vitest'
import { formatCad } from './currency'

describe('formatCad', () => {
  it.each([
    [258, '$258.00'],
    ['12.5', '$12.50'],
    [0.1 + 0.2, '$0.30'],
    [-25, '-$25.00'],
  ])('formats %s as CAD with two fractional digits', (value, expected) => {
    expect(formatCad(value)).toBe(expected)
  })
})
