import { useState, type FormEvent } from 'react'
import { errorMessage } from '../lib/errors'
import { CATEGORY_LABELS, COLOR_STYLES } from '../lib/habitStyles'
import { CATEGORIES, HABIT_COLORS, type Habit, type HabitInput } from '../lib/types'
import { LIMITS, toHabitInput, validateHabit, type FieldErrors, type HabitFormValues } from '../lib/validation'
import { CheckIcon } from './icons'
import { Modal } from './Modal'
import { Alert, Button, TextArea, TextField } from './ui'

interface HabitFormProps {
  habit?: Habit
  onSubmit: (input: HabitInput) => Promise<unknown>
  onCancel: () => void
}

function initialValues(habit?: Habit): HabitFormValues {
  return {
    name: habit?.name ?? '',
    description: habit?.description ?? '',
    category: habit?.category ?? 'health',
    daily_goal: habit?.daily_goal ?? '',
    color: habit?.color ?? 'indigo',
  }
}

export function HabitForm({ habit, onSubmit, onCancel }: HabitFormProps) {
  const [values, setValues] = useState(() => initialValues(habit))
  const [errors, setErrors] = useState<FieldErrors<HabitFormValues>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = (field: keyof HabitFormValues) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validateHabit(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    setSubmitError(null)
    try {
      await onSubmit(toHabitInput(values))
    } catch (e) {
      setSubmitError(errorMessage(e))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {submitError && <Alert>{submitError}</Alert>}

      <TextField
        label="Name"
        value={values.name}
        onChange={(e) => set('name')(e.target.value)}
        error={errors.name}
        placeholder="e.g. Read before bed"
        maxLength={LIMITS.name}
        data-autofocus
        required
      />

      <TextArea
        label="Description"
        optional
        rows={2}
        value={values.description}
        onChange={(e) => set('description')(e.target.value)}
        error={errors.description}
        placeholder="Why does this habit matter to you?"
        maxLength={LIMITS.description}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="habit-category" className="block text-sm font-medium text-slate-700">
            Category
          </label>
          <select
            id="habit-category"
            value={values.category}
            onChange={(e) => set('category')(e.target.value)}
            className="block h-[38px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <TextField
          label="Daily goal"
          optional
          value={values.daily_goal}
          onChange={(e) => set('daily_goal')(e.target.value)}
          error={errors.daily_goal}
          placeholder="e.g. 20 pages"
          maxLength={LIMITS.dailyGoal}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Color</legend>
        <div className="flex flex-wrap gap-2">
          {HABIT_COLORS.map((color) => {
            const selected = values.color === color
            return (
              <label key={color} className="cursor-pointer">
                <input
                  type="radio"
                  name="habit-color"
                  value={color}
                  checked={selected}
                  onChange={() => set('color')(color)}
                  className="peer sr-only"
                />
                <span className="sr-only">{color}</span>
                <span
                  className={`grid size-8 place-items-center rounded-full text-white ring-offset-2 transition peer-focus-visible:ring-2 ${COLOR_STYLES[color].dot} ${
                    selected ? `ring-2 ${COLOR_STYLES[color].ring}` : ''
                  }`}
                >
                  {selected && <CheckIcon className="size-4" />}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {habit ? 'Save changes' : 'Create habit'}
        </Button>
      </div>
    </form>
  )
}

interface HabitDialogProps {
  open: boolean
  habit?: Habit
  onClose: () => void
  onSubmit: (input: HabitInput) => Promise<unknown>
}

export function HabitDialog({ open, habit, onClose, onSubmit }: HabitDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? 'Edit habit' : 'New habit'}
      description={habit ? undefined : 'Small, specific habits are the easiest to keep.'}
    >
      {/* `key` resets the form whenever a different habit is edited. */}
      <HabitForm key={habit?.id ?? 'new'} habit={habit} onSubmit={onSubmit} onCancel={onClose} />
    </Modal>
  )
}
