/**
 * Pure functions that turn habits + completions into dashboard numbers.
 * They have no React or Supabase code in them, which makes them easy to
 * unit test (see stats.test.ts).
 */
import { addDays, lastNDays, timestampToISODate, type ISODate } from './dates'
import type { Habit } from './types'

/** Completions are kept in a Set of "habitId:date" keys for fast lookups. */
export type CompletionSet = ReadonlySet<string>

export function completionKey(habitId: string, date: ISODate): string {
  return `${habitId}:${date}`
}

export function toCompletionSet(rows: { habit_id: string; completed_on: ISODate }[]): Set<string> {
  return new Set(rows.map((row) => completionKey(row.habit_id, row.completed_on)))
}

export function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

export interface DayStats {
  total: number
  completed: number
  remaining: number
  percent: number
}

/** Stats for a single day, counting only the given (active) habits. */
export function dayStats(habits: Habit[], completions: CompletionSet, date: ISODate): DayStats {
  const total = habits.length
  const completed = habits.filter((h) => completions.has(completionKey(h.id, date))).length
  return { total, completed, remaining: total - completed, percent: percent(completed, total) }
}

export interface DailyProgress extends DayStats {
  date: ISODate
}

/**
 * Progress for each of the `days` days ending at `end`.
 *
 * A habit only counts towards a day if it already existed on that day —
 * otherwise creating a new habit would make last week look worse.
 */
export function dailyProgress(
  habits: Habit[],
  completions: CompletionSet,
  end: ISODate,
  days = 7,
): DailyProgress[] {
  return lastNDays(end, days).map((date) => {
    const existing = habits.filter((h) => timestampToISODate(h.created_at) <= date)
    return { date, ...dayStats(existing, completions, date) }
  })
}

export interface StreakStats {
  current: number
  best: number
}

/**
 * Current and best streaks for one habit.
 *
 * The current streak stays "alive" through today: if you did the habit
 * yesterday but not yet today, your streak is not broken until tomorrow.
 */
export function streaks(dates: Iterable<ISODate>, today: ISODate): StreakStats {
  const done = new Set(dates)

  let current = 0
  let cursor = done.has(today) ? today : addDays(today, -1)
  while (done.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }

  let best = 0
  let run = 0
  let previous: ISODate | null = null
  for (const date of [...done].sort()) {
    run = previous !== null && addDays(previous, 1) === date ? run + 1 : 1
    best = Math.max(best, run)
    previous = date
  }

  return { current, best }
}

/** Overall completion rate across several days (total done ÷ total possible). */
export function overallPercent(days: DayStats[]): number {
  const completed = days.reduce((sum, d) => sum + d.completed, 0)
  const total = days.reduce((sum, d) => sum + d.total, 0)
  return percent(completed, total)
}
