import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ProgressRing, WeeklyChart } from '../components/Charts'
import { ErrorState } from '../components/Feedback'
import { HabitCheckRow } from '../components/HabitBits'
import { HabitDialog } from '../components/HabitForm'
import { CheckIcon, ListIcon, PlusIcon, SparklesIcon, TargetIcon } from '../components/icons'
import { Button, Card, EmptyState, PageLoader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useCompletions } from '../hooks/useCompletions'
import { useHabits } from '../hooks/useHabits'
import { useToday } from '../hooks/useToday'
import { addDays, formatLongDate, greeting } from '../lib/dates'
import { completionKey, dailyProgress, dayStats, overallPercent } from '../lib/stats'
import type { HabitInput } from '../lib/types'

function StatCard({ label, value, icon, tone }: { label: string; value: ReactNode; icon: ReactNode; tone: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={`grid size-8 place-items-center rounded-lg ${tone}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
    </Card>
  )
}

function encouragement(percent: number, total: number): string {
  if (total === 0) return 'Add your first habit to get started.'
  if (percent === 100) return 'Perfect day! Every habit is done. 🎉'
  if (percent >= 50) return 'More than halfway there. Keep going!'
  if (percent > 0) return 'Nice start. One habit at a time.'
  return 'A fresh day. Pick one habit and begin.'
}

export function DashboardPage() {
  const { displayName } = useAuth()
  const toast = useToast()
  const today = useToday()
  const habitsState = useHabits()
  const completionsState = useCompletions({ from: addDays(today, -6), to: today })
  const [creating, setCreating] = useState(false)

  const activeHabits = useMemo(() => habitsState.habits.filter((h) => !h.is_archived), [habitsState.habits])
  const todayStats = dayStats(activeHabits, completionsState.completions, today)
  const week = dailyProgress(activeHabits, completionsState.completions, today, 7)
  const weekPercent = overallPercent(week)

  async function handleCreate(input: HabitInput) {
    const habit = await habitsState.create(input)
    setCreating(false)
    toast.success(`"${habit.name}" was added. You've got this!`)
  }

  const status = habitsState.status === 'error' || completionsState.status === 'error' ? 'error' : habitsState.status === 'loading' || completionsState.status === 'loading' ? 'loading' : 'ready'
  const reload = () => {
    void habitsState.reload()
    void completionsState.reload()
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">{formatLongDate(today)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {greeting()}, {displayName}
          </h1>
        </div>
        {status === 'ready' && activeHabits.length > 0 && (
          <Button onClick={() => setCreating(true)}>
            <PlusIcon className="size-4" /> New habit
          </Button>
        )}
      </div>

      {status === 'loading' && <PageLoader label="Loading your habits…" />}
      {status === 'error' && <ErrorState error={habitsState.error ?? completionsState.error} onRetry={reload} />}

      {status === 'ready' && activeHabits.length === 0 && (
        <Card>
          <EmptyState
            icon={<SparklesIcon className="size-6" />}
            title={habitsState.habits.length > 0 ? 'All your habits are archived' : 'Welcome to HabitFlow!'}
            description={
              habitsState.habits.length > 0
                ? 'Create a new habit, or restore an archived one from the Habits page.'
                : 'Create your first habit — something small you want to do every day, like drinking water or reading 10 pages.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setCreating(true)}>
                  <PlusIcon className="size-4" /> Create your first habit
                </Button>
                {habitsState.habits.length > 0 && (
                  <Link to="/habits" className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                    View archived
                  </Link>
                )}
              </div>
            }
          />
        </Card>
      )}

      {status === 'ready' && activeHabits.length > 0 && (
        <>
          <section aria-label="Today's summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Active habits" value={todayStats.total} icon={<ListIcon className="size-4" />} tone="bg-slate-100 text-slate-600" />
            <StatCard label="Completed today" value={todayStats.completed} icon={<CheckIcon className="size-4" />} tone="bg-emerald-50 text-emerald-600" />
            <StatCard label="Remaining" value={todayStats.remaining} icon={<TargetIcon className="size-4" />} tone="bg-amber-50 text-amber-600" />
            <StatCard label="Today's progress" value={`${todayStats.percent}%`} icon={<SparklesIcon className="size-4" />} tone="bg-indigo-50 text-indigo-600" />
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
                <div>
                  <h2 className="font-semibold text-slate-900">Today's habits</h2>
                  <p className="text-sm text-slate-500">
                    {todayStats.completed} of {todayStats.total} done
                  </p>
                </div>
                <Link to="/habits" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                  Manage
                </Link>
              </div>
              <ul className="divide-y divide-slate-100">
                {activeHabits.map((habit) => {
                  const key = completionKey(habit.id, today)
                  return (
                    <HabitCheckRow
                      key={habit.id}
                      habit={habit}
                      done={completionsState.completions.has(key)}
                      pending={completionsState.pending.has(key)}
                      onToggle={() => completionsState.toggle(habit.id, today)}
                    />
                  )
                })}
              </ul>
            </Card>

            <div className="space-y-6 lg:col-span-2">
              <Card className="flex items-center gap-5 p-5">
                <ProgressRing percent={todayStats.percent} size={104} />
                <div>
                  <h2 className="font-semibold text-slate-900">Daily goal</h2>
                  <p className="mt-1 text-sm text-slate-500">{encouragement(todayStats.percent, todayStats.total)}</p>
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="font-semibold text-slate-900">Last 7 days</h2>
                  <p className="text-sm text-slate-500">{weekPercent}% overall</p>
                </div>
                <WeeklyChart days={week} today={today} />
              </Card>
            </div>
          </div>
        </>
      )}

      <HabitDialog open={creating} onClose={() => setCreating(false)} onSubmit={handleCreate} />
    </div>
  )
}
