import { describe, expect, it } from 'vitest'
import { completionKey, dailyProgress, dayStats, overallPercent, percent, streaks, toCompletionSet } from './stats'
import type { Habit } from './types'

function habit(id: string, createdOn = '2026-01-01'): Habit {
  return {
    id,
    user_id: 'u',
    name: id,
    description: null,
    category: 'other',
    daily_goal: null,
    color: 'indigo',
    is_archived: false,
    // Midday local time, so the local date is the same in every timezone.
    created_at: new Date(`${createdOn}T12:00:00`).toISOString(),
    updated_at: new Date(`${createdOn}T12:00:00`).toISOString(),
  }
}

describe('percent', () => {
  it('rounds and handles zero', () => {
    expect(percent(1, 3)).toBe(33)
    expect(percent(2, 3)).toBe(67)
    expect(percent(0, 0)).toBe(0)
  })
})

describe('dayStats', () => {
  it('counts completed and remaining habits for a day', () => {
    const habits = [habit('a'), habit('b'), habit('c')]
    const done = toCompletionSet([
      { habit_id: 'a', completed_on: '2026-10-26' },
      { habit_id: 'b', completed_on: '2026-10-25' }, // a different day
      { habit_id: 'zzz', completed_on: '2026-10-26' }, // not an active habit
    ])
    expect(dayStats(habits, done, '2026-10-26')).toEqual({ total: 3, completed: 1, remaining: 2, percent: 33 })
  })

  it('is all zeros with no habits', () => {
    expect(dayStats([], new Set(), '2026-10-26')).toEqual({ total: 0, completed: 0, remaining: 0, percent: 0 })
  })
})

describe('dailyProgress', () => {
  it('only counts habits that existed on each day', () => {
    const habits = [habit('old', '2026-10-01'), habit('new', '2026-10-25')]
    const done = new Set([completionKey('old', '2026-10-24'), completionKey('old', '2026-10-25'), completionKey('new', '2026-10-25')])
    const days = dailyProgress(habits, done, '2026-10-26', 3)
    expect(days).toEqual([
      { date: '2026-10-24', total: 1, completed: 1, remaining: 0, percent: 100 },
      { date: '2026-10-25', total: 2, completed: 2, remaining: 0, percent: 100 },
      { date: '2026-10-26', total: 2, completed: 0, remaining: 2, percent: 0 },
    ])
    expect(overallPercent(days)).toBe(60) // 3 of 5
  })
})

describe('streaks', () => {
  it('counts a streak that includes today', () => {
    expect(streaks(['2026-10-24', '2026-10-25', '2026-10-26'], '2026-10-26')).toEqual({ current: 3, best: 3 })
  })

  it('keeps yesterday’s streak alive until today is over', () => {
    expect(streaks(['2026-10-24', '2026-10-25'], '2026-10-26').current).toBe(2)
  })

  it('resets when a day is missed', () => {
    expect(streaks(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-24'], '2026-10-26')).toEqual({ current: 0, best: 3 })
  })

  it('handles month boundaries and unsorted input', () => {
    expect(streaks(['2026-11-01', '2026-10-31', '2026-10-30'], '2026-11-01')).toEqual({ current: 3, best: 3 })
  })

  it('is zero with no completions', () => {
    expect(streaks([], '2026-10-26')).toEqual({ current: 0, best: 0 })
  })
})
