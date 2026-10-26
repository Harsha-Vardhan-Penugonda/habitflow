import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, COLOR_STYLES } from '../lib/habitStyles'
import type { Habit } from '../lib/types'
import { CheckIcon, TargetIcon } from './icons'

export function CategoryBadge({ habit }: { habit: Habit }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_STYLES[habit.color].soft}`}>
      {CATEGORY_LABELS[habit.category]}
    </span>
  )
}

export function GoalText({ goal }: { goal: string | null }) {
  if (!goal) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <TargetIcon className="size-3.5" />
      {goal}
    </span>
  )
}

interface CompletionButtonProps {
  habit: Habit
  done: boolean
  pending: boolean
  onToggle: () => void
  label: string
}

/** The round checkbox used to mark a habit done (and to undo it). */
export function CompletionButton({ habit, done, pending, onToggle, label }: CompletionButtonProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      aria-busy={pending || undefined}
      onClick={onToggle}
      disabled={pending}
      className={`grid size-9 shrink-0 place-items-center rounded-full border-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-wait ${
        done ? `${COLOR_STYLES[habit.color].solid} text-white` : 'border-slate-300 bg-white text-transparent hover:border-slate-400 hover:text-slate-300'
      }`}
    >
      <CheckIcon className={`size-5 ${done ? 'check-pop' : ''}`} strokeWidth={3} />
    </button>
  )
}

interface HabitCheckRowProps {
  habit: Habit
  done: boolean
  pending: boolean
  onToggle: () => void
}

export function HabitCheckRow({ habit, done, pending, onToggle }: HabitCheckRowProps) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <CompletionButton
        habit={habit}
        done={done}
        pending={pending}
        onToggle={onToggle}
        label={done ? `Mark "${habit.name}" as not done today` : `Mark "${habit.name}" as done today`}
      />
      <div className="min-w-0 flex-1">
        <Link
          to={`/habits/${habit.id}`}
          className={`block truncate text-sm font-medium hover:text-indigo-600 ${done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'}`}
        >
          {habit.name}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <CategoryBadge habit={habit} />
          <GoalText goal={habit.daily_goal} />
        </div>
      </div>
    </li>
  )
}
