import type { ISODate } from './dates'

export const CATEGORIES = [
  'health',
  'fitness',
  'mindfulness',
  'learning',
  'productivity',
  'social',
  'finance',
  'creativity',
  'other',
] as const
export type Category = (typeof CATEGORIES)[number]

export const HABIT_COLORS = ['indigo', 'emerald', 'amber', 'rose', 'sky', 'violet', 'teal', 'orange'] as const
export type HabitColor = (typeof HABIT_COLORS)[number]

/** A row in the `habits` table. */
export interface Habit {
  id: string
  user_id: string
  name: string
  description: string | null
  category: Category
  daily_goal: string | null
  color: HabitColor
  is_archived: boolean
  created_at: string
  updated_at: string
}

/** The fields a user can fill in when creating or editing a habit. */
export interface HabitInput {
  name: string
  description: string | null
  category: Category
  daily_goal: string | null
  color: HabitColor
}

/** A row in the `habit_completions` table. */
export interface Completion {
  id: string
  habit_id: string
  completed_on: ISODate
}

export interface Profile {
  id: string
  display_name: string | null
}
