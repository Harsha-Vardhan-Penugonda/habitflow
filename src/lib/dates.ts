/**
 * Date helpers.
 *
 * Completions are stored as plain calendar dates ("2026-10-26"), not
 * timestamps. We always work with the user's LOCAL calendar date so that
 * "today" matches the user's wall clock, wherever they live.
 * `new Date().toISOString()` would give the UTC date instead — a classic bug.
 */

/** A calendar date in YYYY-MM-DD format. */
export type ISODate = string

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parses YYYY-MM-DD as a local date (midnight local time). */
export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export function addDays(value: ISODate, days: number): ISODate {
  const date = parseISODate(value)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** The `count` dates ending at (and including) `end`, oldest first. */
export function lastNDays(end: ISODate, count: number): ISODate[] {
  return Array.from({ length: count }, (_, i) => addDays(end, i - (count - 1)))
}

/** Converts a database timestamp to the local calendar date it falls on. */
export function timestampToISODate(timestamp: string): ISODate {
  return toISODate(new Date(timestamp))
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: ISODate, to: ISODate): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime()
  return Math.round(ms / 86_400_000)
}

export function formatDate(value: ISODate, options: Intl.DateTimeFormatOptions): string {
  return parseISODate(value).toLocaleDateString(undefined, options)
}

export function formatLongDate(value: ISODate): string {
  return formatDate(value, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function formatWeekday(value: ISODate): string {
  return formatDate(value, { weekday: 'short' })
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
