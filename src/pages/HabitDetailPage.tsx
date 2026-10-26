import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState, NotFound } from '../components/Feedback'
import { CategoryBadge, CompletionButton, GoalText } from '../components/HabitBits'
import { HabitDialog } from '../components/HabitForm'
import { HistoryCalendar } from '../components/HistoryCalendar'
import { ArchiveIcon, CheckIcon, ChevronLeftIcon, FlameIcon, PencilIcon, RestoreIcon, TrashIcon, TrophyIcon } from '../components/icons'
import { ConfirmDialog } from '../components/Modal'
import { Button, Card, PageLoader } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { useCompletions } from '../hooks/useCompletions'
import type { LoadStatus } from '../hooks/useHabits'
import { useToday } from '../hooks/useToday'
import * as api from '../lib/api'
import { addDays, daysBetween, formatDate, timestampToISODate, type ISODate } from '../lib/dates'
import { errorMessage, toAppError, type AppError } from '../lib/errors'
import { COLOR_STYLES } from '../lib/habitStyles'
import { percent, streaks } from '../lib/stats'
import type { Habit, HabitInput } from '../lib/types'

/** Strips the "habitId:" prefix from completion keys to get plain dates. */
function datesFor(habitId: string, keys: ReadonlySet<string>): Set<ISODate> {
  const prefix = `${habitId}:`
  return new Set([...keys].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)))
}

function MiniStat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </Card>
  )
}

export function HabitDetailPage() {
  const { habitId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const today = useToday()

  const [habit, setHabit] = useState<Habit | null>(null)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState<AppError | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadHabit = useCallback(async () => {
    setStatus('loading')
    try {
      setHabit(await api.fetchHabit(habitId))
      setStatus('ready')
    } catch (e) {
      setError(toAppError(e))
      setStatus('error')
    }
  }, [habitId])

  useEffect(() => {
    void loadHabit()
  }, [loadHabit])

  const completionsState = useCompletions({ habitId })
  const done = useMemo(() => datesFor(habitId, completionsState.completions), [habitId, completionsState.completions])
  const pending = useMemo(() => datesFor(habitId, completionsState.pending), [habitId, completionsState.pending])

  if (status === 'loading' || (status === 'ready' && habit && completionsState.status === 'loading')) return <PageLoader />
  if (status === 'error' || completionsState.status === 'error') {
    return (
      <ErrorState
        error={error ?? completionsState.error}
        onRetry={() => {
          void loadHabit()
          void completionsState.reload()
        }}
      />
    )
  }
  if (!habit) return <NotFound message="This habit doesn't exist, or it belongs to someone else." />

  const createdOn = timestampToISODate(habit.created_at)
  const { current, best } = streaks(done, today)
  // Completion rate over the last 30 days (or since the habit was created, if newer).
  const windowStart = createdOn > addDays(today, -29) ? createdOn : addDays(today, -29)
  const windowDays = daysBetween(windowStart, today) + 1
  const doneInWindow = [...done].filter((d) => d >= windowStart && d <= today).length
  const recent = [...done].sort().reverse().slice(0, 10)
  const doneToday = done.has(today)

  async function handleEdit(input: HabitInput) {
    setHabit(await api.updateHabit(habit!.id, input))
    setEditing(false)
    toast.success('Habit updated.')
  }

  async function toggleArchive() {
    try {
      setHabit(await api.updateHabit(habit!.id, { is_archived: !habit!.is_archived }))
      toast.success(habit!.is_archived ? 'Habit restored.' : 'Habit archived. Its history is kept.')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.deleteHabit(habit!.id)
      toast.success(`"${habit!.name}" was deleted.`)
      navigate('/habits', { replace: true })
    } catch (e) {
      toast.error(errorMessage(e))
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/habits" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ChevronLeftIcon className="size-4" /> All habits
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className={`mt-1.5 size-3 shrink-0 rounded-full ${COLOR_STYLES[habit.color].dot}`} aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-900">{habit.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <CategoryBadge habit={habit} />
                <GoalText goal={habit.daily_goal} />
                {habit.is_archived && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Archived</span>}
              </div>
              {habit.description && <p className="mt-3 text-sm text-slate-600">{habit.description}</p>}
              <p className="mt-3 text-xs text-slate-400">Tracking since {formatDate(createdOn, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <PencilIcon className="size-4" /> Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={toggleArchive}>
              {habit.is_archived ? <RestoreIcon className="size-4" /> : <ArchiveIcon className="size-4" />}
              {habit.is_archived ? 'Restore' : 'Archive'}
            </Button>
            <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setConfirmingDelete(true)}>
              <TrashIcon className="size-4" /> Delete
            </Button>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <CompletionButton
            habit={habit}
            done={doneToday}
            pending={pending.has(today)}
            onToggle={() => completionsState.toggle(habit.id, today)}
            label={doneToday ? 'Mark as not done today' : 'Mark as done today'}
          />
          <p className="text-sm text-slate-700">{doneToday ? 'Done for today — nice work!' : 'Not done yet today.'}</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MiniStat icon={<FlameIcon className="size-4 text-orange-500" />} label="Current streak" value={`${current} ${current === 1 ? 'day' : 'days'}`} />
        <MiniStat icon={<TrophyIcon className="size-4 text-amber-500" />} label="Best streak" value={`${best} ${best === 1 ? 'day' : 'days'}`} />
        <MiniStat icon={<CheckIcon className="size-4 text-emerald-500" />} label="Total check-ins" value={done.size} />
        <MiniStat
          icon={<span className="text-xs font-bold text-indigo-500">%</span>}
          label="Success rate"
          value={`${percent(doneInWindow, windowDays)}%`}
          hint={`${doneInWindow} of the last ${windowDays} ${windowDays === 1 ? 'day' : 'days'}`}
        />
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="font-semibold text-slate-900">History</h2>
          <p className="text-sm text-slate-500">Click any past day to add or remove a check-in.</p>
        </div>
        <HistoryCalendar
          habit={habit}
          done={done}
          pending={pending}
          today={today}
          firstDate={createdOn}
          onToggle={(date) => completionsState.toggle(habit.id, date)}
        />
      </Card>

      <Card>
        <h2 className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900">Recent check-ins</h2>
        {recent.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No check-ins yet. Mark today as done to start your streak!</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((date) => (
              <li key={date} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="text-slate-700">{formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <Button variant="ghost" size="sm" disabled={pending.has(date)} onClick={() => completionsState.toggle(habit.id, date)}>
                  Undo
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <HabitDialog open={editing} habit={habit} onClose={() => setEditing(false)} onSubmit={handleEdit} />
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete habit?"
        message={<p>This permanently deletes "{habit.name}" and all {done.size} of its check-ins. Archive it instead if you might want the history later.</p>}
        confirmLabel="Delete habit"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  )
}
