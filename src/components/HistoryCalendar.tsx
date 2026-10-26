import { useEffect, useRef } from 'react'
import { addDays, formatDate, parseISODate, type ISODate } from '../lib/dates'
import { COLOR_STYLES } from '../lib/habitStyles'
import type { Habit } from '../lib/types'

interface HistoryCalendarProps {
  habit: Habit
  /** Completed dates for this habit. */
  done: ReadonlySet<ISODate>
  pending: ReadonlySet<ISODate>
  today: ISODate
  /** First date that can be toggled (the day the habit was created). */
  firstDate: ISODate
  weeks?: number
  onToggle: (date: ISODate) => void
}

const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']

/**
 * A GitHub-style grid of the last few weeks. Each column is a week
 * (Monday → Sunday). Click a past day to add or remove a completion.
 */
export function HistoryCalendar({ habit, done, pending, today, firstDate, weeks = 14, onToggle }: HistoryCalendarProps) {
  // Find the Monday of the current week, then go back (weeks - 1) weeks.
  const mondayOffset = (parseISODate(today).getDay() + 6) % 7
  const start = addDays(today, -mondayOffset - (weeks - 1) * 7)
  // On narrow screens the grid scrolls sideways; start at the most recent week.
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [])

  const columns = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))

  return (
    <div ref={scrollRef} className="overflow-x-auto pb-1">
      <div className="inline-flex gap-1.5">
        <div className="mr-1 grid grid-rows-7 gap-1.5 text-[10px] leading-none text-slate-400">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} className="flex h-6 items-center sm:h-7">
              {label}
            </span>
          ))}
        </div>
        {columns.map((column) => (
          <div key={column[0]} className="grid grid-rows-7 gap-1.5">
            {column.map((date) => {
              const isFuture = date > today
              const beforeStart = date < firstDate
              const isDone = done.has(date)
              const isPending = pending.has(date)
              const label = `${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${isDone ? ', completed' : ''}`

              if (isFuture) return <span key={date} className="size-6 sm:size-7" />
              return (
                <button
                  key={date}
                  type="button"
                  aria-label={label}
                  aria-pressed={isDone}
                  title={beforeStart ? `${label} (before this habit was created)` : label}
                  disabled={beforeStart || isPending}
                  onClick={() => onToggle(date)}
                  className={`size-6 rounded-md transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 sm:size-7 ${
                    isDone ? COLOR_STYLES[habit.color].dot : beforeStart ? 'bg-slate-50' : 'bg-slate-100 hover:bg-slate-200'
                  } ${date === today ? 'ring-2 ring-slate-900/70 ring-offset-1' : ''} ${isPending ? 'animate-pulse' : ''} disabled:cursor-default`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
