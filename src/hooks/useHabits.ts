import { useCallback, useEffect, useState } from 'react'
import * as api from '../lib/api'
import { toAppError, type AppError } from '../lib/errors'
import type { Habit, HabitInput } from '../lib/types'

export type LoadStatus = 'loading' | 'ready' | 'error'

/** Loads the user's habits and keeps the list in sync after every change. */
export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState<AppError | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      setHabits(await api.fetchHabits())
      setStatus('ready')
    } catch (e) {
      setError(toAppError(e))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const create = useCallback(async (input: HabitInput) => {
    const habit = await api.createHabit(input)
    setHabits((list) => [...list, habit])
    return habit
  }, [])

  const update = useCallback(async (id: string, changes: Partial<HabitInput & { is_archived: boolean }>) => {
    const habit = await api.updateHabit(id, changes)
    setHabits((list) => list.map((h) => (h.id === id ? habit : h)))
    return habit
  }, [])

  const remove = useCallback(async (id: string) => {
    await api.deleteHabit(id)
    setHabits((list) => list.filter((h) => h.id !== id))
  }, [])

  return { habits, status, error, reload: load, create, update, remove }
}
