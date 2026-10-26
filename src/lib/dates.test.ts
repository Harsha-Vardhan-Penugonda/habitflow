import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, lastNDays, parseISODate, toISODate } from './dates'

describe('dates', () => {
  it('formats the LOCAL calendar date, not the UTC one', () => {
    // 23:30 local time on Oct 26 is still Oct 26, even if UTC is already Oct 27.
    expect(toISODate(new Date(2026, 9, 26, 23, 30))).toBe('2026-10-26')
    expect(toISODate(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05')
  })

  it('parses dates as local midnight', () => {
    const d = parseISODate('2026-03-09')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 9, 0])
  })

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29') // leap year
  })

  it('builds a list of the last N days, oldest first', () => {
    expect(lastNDays('2026-10-26', 3)).toEqual(['2026-10-24', '2026-10-25', '2026-10-26'])
  })

  it('counts whole days between dates', () => {
    expect(daysBetween('2026-10-20', '2026-10-26')).toBe(6)
    // Daylight-saving changes must not produce fractional days.
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31)
    expect(daysBetween('2026-10-01', '2026-11-30')).toBe(60)
  })
})
