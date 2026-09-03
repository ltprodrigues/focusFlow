import { describe, expect, it } from 'vitest'
import { getWeekRange } from './week'

describe('getWeekRange', () => {
  it('returns Monday through Friday for a Wednesday', () => {
    const range = getWeekRange(new Date(2026, 7, 26, 12))

    expect(range.days.map((day) => day.getDate())).toEqual([24, 25, 26, 27, 28])
  })

  it('moves a Sunday back to the preceding school week', () => {
    expect(getWeekRange(new Date(2026, 7, 30, 12)).start.getDate()).toBe(24)
  })
})
