import { CATEGORIES, HABIT_COLORS, type HabitInput } from './types'

/**
 * Form validation. These rules mirror the database constraints in
 * supabase/schema.sql. The database is the real gatekeeper — this just
 * gives users friendly messages before a request is even sent.
 */

export type FieldErrors<T> = Partial<Record<keyof T, string>>

export const LIMITS = { name: 60, description: 280, dailyGoal: 80, displayName: 60, minPassword: 8 }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Email is required.'
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.'
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required.'
  if (password.length < LIMITS.minPassword) return `Use at least ${LIMITS.minPassword} characters.`
}

export interface HabitFormValues {
  name: string
  description: string
  category: string
  daily_goal: string
  color: string
}

export function validateHabit(values: HabitFormValues): FieldErrors<HabitFormValues> {
  const errors: FieldErrors<HabitFormValues> = {}
  const name = values.name.trim()
  if (!name) errors.name = 'Give your habit a name.'
  else if (name.length > LIMITS.name) errors.name = `Keep the name under ${LIMITS.name} characters.`

  if (values.description.trim().length > LIMITS.description) {
    errors.description = `Keep the description under ${LIMITS.description} characters.`
  }
  if (values.daily_goal.trim().length > LIMITS.dailyGoal) {
    errors.daily_goal = `Keep the goal under ${LIMITS.dailyGoal} characters.`
  }
  if (!(CATEGORIES as readonly string[]).includes(values.category)) errors.category = 'Pick a category.'
  if (!(HABIT_COLORS as readonly string[]).includes(values.color)) errors.color = 'Pick a color.'
  return errors
}

/** Turns validated form values into the shape the database expects. */
export function toHabitInput(values: HabitFormValues): HabitInput {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    category: values.category as HabitInput['category'],
    daily_goal: values.daily_goal.trim() || null,
    color: values.color as HabitInput['color'],
  }
}
