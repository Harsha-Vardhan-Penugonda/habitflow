/**
 * All database access lives in this file, so components never build
 * queries themselves. Row Level Security on the database makes sure every
 * query only ever sees the logged-in user's rows — we never need to add
 * `.eq('user_id', ...)` for security (though it would not hurt).
 */
import type { ISODate } from './dates'
import { toAppError } from './errors'
import { getSupabase } from './supabase'
import type { Completion, Habit, HabitInput, Profile } from './types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const HABIT_COLUMNS = 'id, user_id, name, description, category, daily_goal, color, is_archived, created_at, updated_at'

/** Supabase returns `{ data, error }` instead of throwing; this unwraps it. */
function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw toAppError(result.error)
  return result.data as T
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const result = await getSupabase().from('profiles').select('id, display_name').eq('id', userId).maybeSingle()
  return unwrap<Profile | null>(result)
}

export async function fetchHabits(): Promise<Habit[]> {
  const result = await getSupabase().from('habits').select(HABIT_COLUMNS).order('created_at', { ascending: true })
  return unwrap<Habit[]>(result)
}

export async function fetchHabit(id: string): Promise<Habit | null> {
  if (!UUID_PATTERN.test(id)) return null // e.g. a mistyped URL
  const result = await getSupabase().from('habits').select(HABIT_COLUMNS).eq('id', id).maybeSingle()
  return unwrap<Habit | null>(result)
}

export async function createHabit(input: HabitInput): Promise<Habit> {
  // user_id is filled in by the database (default auth.uid()).
  const result = await getSupabase().from('habits').insert(input).select(HABIT_COLUMNS).single()
  return unwrap<Habit>(result)
}

export async function updateHabit(id: string, changes: Partial<HabitInput & { is_archived: boolean }>): Promise<Habit> {
  const result = await getSupabase().from('habits').update(changes).eq('id', id).select(HABIT_COLUMNS).single()
  return unwrap<Habit>(result)
}

export async function deleteHabit(id: string): Promise<void> {
  // Completions are removed automatically (ON DELETE CASCADE).
  unwrap(await getSupabase().from('habits').delete().eq('id', id))
}

export async function fetchCompletions(options: { from?: ISODate; to?: ISODate; habitId?: string }): Promise<Completion[]> {
  if (options.habitId && !UUID_PATTERN.test(options.habitId)) return []
  let query = getSupabase().from('habit_completions').select('id, habit_id, completed_on')
  if (options.from) query = query.gte('completed_on', options.from)
  if (options.to) query = query.lte('completed_on', options.to)
  if (options.habitId) query = query.eq('habit_id', options.habitId)
  const result = await query.order('completed_on', { ascending: false })
  return unwrap<Completion[]>(result)
}

export async function addCompletion(habitId: string, date: ISODate): Promise<void> {
  const { error } = await getSupabase().from('habit_completions').insert({ habit_id: habitId, completed_on: date })
  // 23505 = unique violation: it is already marked as done (e.g. from another
  // tab or a double click), which is exactly the state we wanted.
  if (error && (error as { code?: string }).code !== '23505') throw toAppError(error)
}

export async function removeCompletion(habitId: string, date: ISODate): Promise<void> {
  unwrap(await getSupabase().from('habit_completions').delete().eq('habit_id', habitId).eq('completed_on', date))
}

