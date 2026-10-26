import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '../components/Feedback'
import { CategoryBadge, GoalText } from '../components/HabitBits'
import { HabitDialog } from '../components/HabitForm'
import { ArchiveIcon, ChevronRightIcon, ListIcon, PencilIcon, PlusIcon, RestoreIcon, TrashIcon } from '../components/icons'
import { ConfirmDialog } from '../components/Modal'
import { Button, Card, EmptyState, PageLoader } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { useHabits } from '../hooks/useHabits'
import { errorMessage } from '../lib/errors'
import { COLOR_STYLES } from '../lib/habitStyles'
import type { Habit, HabitInput } from '../lib/types'

function IconButton({ label, onClick, children, danger }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 text-slate-400 transition-colors ${danger ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-slate-100 hover:text-slate-700'}`}
    >
      {children}
    </button>
  )
}

export function HabitsPage() {
  const toast = useToast()
  const { habits, status, error, reload, create, update, remove } = useHabits()
  const [dialog, setDialog] = useState<{ mode: 'create' } | { mode: 'edit'; habit: Habit } | null>(null)
  const [toDelete, setToDelete] = useState<Habit | null>(null)
  const [deleting, setDeleting] = useState(false)

  const active = habits.filter((h) => !h.is_archived)
  const archived = habits.filter((h) => h.is_archived)

  async function handleSubmit(input: HabitInput) {
    if (dialog?.mode === 'edit') {
      await update(dialog.habit.id, input)
      toast.success('Habit updated.')
    } else {
      const habit = await create(input)
      toast.success(`"${habit.name}" was added.`)
    }
    setDialog(null)
  }

  async function toggleArchive(habit: Habit) {
    try {
      await update(habit.id, { is_archived: !habit.is_archived })
      toast.success(habit.is_archived ? `"${habit.name}" is active again.` : `"${habit.name}" was archived. Its history is kept.`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await remove(toDelete.id)
      toast.success(`"${toDelete.name}" was deleted.`)
      setToDelete(null)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  const renderRow = (habit: Habit) => (
    <li key={habit.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className={`size-2.5 shrink-0 rounded-full ${COLOR_STYLES[habit.color].dot} ${habit.is_archived ? 'opacity-40' : ''}`} aria-hidden="true" />
      <Link to={`/habits/${habit.id}`} className="group min-w-0 flex-1">
        <span className={`flex items-center gap-1 truncate text-sm font-medium group-hover:text-indigo-600 ${habit.is_archived ? 'text-slate-500' : 'text-slate-900'}`}>
          <span className="truncate">{habit.name}</span>
          <ChevronRightIcon className="size-4 shrink-0 text-slate-300 group-hover:text-indigo-400" />
        </span>
        {habit.description && <span className="mt-0.5 block truncate text-xs text-slate-500">{habit.description}</span>}
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <CategoryBadge habit={habit} />
          <GoalText goal={habit.daily_goal} />
        </span>
      </Link>
      <div className="flex shrink-0 items-center">
        <IconButton label={`Edit "${habit.name}"`} onClick={() => setDialog({ mode: 'edit', habit })}>
          <PencilIcon className="size-4" />
        </IconButton>
        <IconButton label={habit.is_archived ? `Restore "${habit.name}"` : `Archive "${habit.name}"`} onClick={() => toggleArchive(habit)}>
          {habit.is_archived ? <RestoreIcon className="size-4" /> : <ArchiveIcon className="size-4" />}
        </IconButton>
        <IconButton label={`Delete "${habit.name}"`} onClick={() => setToDelete(habit)} danger>
          <TrashIcon className="size-4" />
        </IconButton>
      </div>
    </li>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Habits</h1>
          <p className="mt-1 text-sm text-slate-500">Create, edit and organise the habits you track.</p>
        </div>
        {status === 'ready' && habits.length > 0 && (
          <Button onClick={() => setDialog({ mode: 'create' })}>
            <PlusIcon className="size-4" /> <span className="hidden sm:inline">New habit</span>
            <span className="sr-only sm:hidden">New habit</span>
          </Button>
        )}
      </div>

      {status === 'loading' && <PageLoader />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}

      {status === 'ready' && habits.length === 0 && (
        <Card>
          <EmptyState
            icon={<ListIcon className="size-6" />}
            title="No habits yet"
            description="Habits you create will show up here. Start with one small thing you'd like to do every day."
            action={
              <Button onClick={() => setDialog({ mode: 'create' })}>
                <PlusIcon className="size-4" /> Create a habit
              </Button>
            }
          />
        </Card>
      )}

      {status === 'ready' && habits.length > 0 && (
        <>
          <section aria-labelledby="active-heading">
            <h2 id="active-heading" className="mb-2 text-sm font-medium text-slate-500">
              Active · {active.length}
            </h2>
            <Card>
              {active.length > 0 ? (
                <ul className="divide-y divide-slate-100">{active.map(renderRow)}</ul>
              ) : (
                <p className="px-5 py-6 text-center text-sm text-slate-500">No active habits. Restore one below or create a new one.</p>
              )}
            </Card>
          </section>

          {archived.length > 0 && (
            <section aria-labelledby="archived-heading">
              <h2 id="archived-heading" className="mb-2 text-sm font-medium text-slate-500">
                Archived · {archived.length}
              </h2>
              <Card>
                <ul className="divide-y divide-slate-100">{archived.map(renderRow)}</ul>
              </Card>
            </section>
          )}
        </>
      )}

      <HabitDialog
        open={dialog !== null}
        habit={dialog?.mode === 'edit' ? dialog.habit : undefined}
        onClose={() => setDialog(null)}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete habit?"
        message={
          <p>
            <strong className="text-slate-900">"{toDelete?.name}"</strong> and its entire completion history will be permanently deleted. If you just want
            to stop tracking it, archive it instead.
          </p>
        }
        confirmLabel="Delete habit"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
