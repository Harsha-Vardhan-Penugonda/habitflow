import { formatDate, formatWeekday, type ISODate } from '../lib/dates'
import type { DailyProgress } from '../lib/stats'

/** A simple bar chart of the last 7 days, built with plain divs. */
export function WeeklyChart({ days, today }: { days: DailyProgress[]; today: ISODate }) {
  return (
    <div>
      <div className="flex h-44 items-end gap-2 sm:gap-3" role="list" aria-label="Completion rate for the last 7 days">
        {days.map((day) => {
          const isToday = day.date === today
          const label = `${formatDate(day.date, { weekday: 'long', month: 'short', day: 'numeric' })}: ${day.completed} of ${day.total} habits, ${day.percent}%`
          return (
            <div key={day.date} role="listitem" aria-label={label} title={label} className="flex h-full flex-1 flex-col items-center gap-2">
              <span className={`text-xs font-medium ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>{day.total > 0 ? `${day.percent}%` : '–'}</span>
              <div className="relative w-full flex-1 overflow-hidden rounded-lg bg-slate-100">
                <div
                  className={`absolute inset-x-0 bottom-0 rounded-lg transition-[height] duration-500 ${isToday ? 'bg-indigo-500' : 'bg-indigo-300'}`}
                  style={{ height: `${day.percent}%` }}
                />
              </div>
              <span className={`text-xs ${isToday ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{isToday ? 'Today' : formatWeekday(day.date)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** A circular progress ring for today's completion percentage. */
export function ProgressRing({ percent, size = 120 }: { percent: number; size?: number }) {
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="fill-none stroke-slate-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          className="fill-none stroke-indigo-500 transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-2xl font-semibold tracking-tight text-slate-900">{percent}%</span>
      </div>
    </div>
  )
}
