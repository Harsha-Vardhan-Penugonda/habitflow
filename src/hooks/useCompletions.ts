import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../context/ToastContext'
import * as api from '../lib/api'
import type { ISODate } from '../lib/dates'
import { errorMessage, toAppError, type AppError } from '../lib/errors'
import { completionKey, toCompletionSet } from '../lib/stats'
import type { LoadStatus } from './useHabits'

interface Options {
  from?: ISODate
  to?: ISODate
  habitId?: string
}

/**
 * Loads completions for a date range and lets the user toggle them.
 *
 * Toggling is "optimistic": the checkmark updates instantly and is rolled
 * back (with an error toast) if the database request fails.
 */
export function useCompletions({ from, to, habitId }: Options) {
  const toast = useToast()
  const [completions, setCompletions] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState<AppError | null>(null)
  const [pending, setPending] = useState<Set<string>>(new Set())

  // A ref mirror so `toggle` always sees the latest state.
  const completionsRef = useRef(completions)
  completionsRef.current = completions
  const pendingRef = useRef(new Set<string>())

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const rows = await api.fetchCompletions({ from, to, habitId })
      setCompletions(toCompletionSet(rows))
      setStatus('ready')
    } catch (e) {
      setError(toAppError(e))
      setStatus('error')
    }
  }, [from, to, habitId])

  useEffect(() => {
    void load()
  }, [load])

  const setKey = (key: string, done: boolean) =>
    setCompletions((current) => {
      const next = new Set(current)
      if (done) next.add(key)
      else next.delete(key)
      return next
    })

  const setPendingKey = (key: string, isPending: boolean) => {
    if (isPending) pendingRef.current.add(key)
    else pendingRef.current.delete(key)
    setPending(new Set(pendingRef.current))
  }

  const toggle = useCallback(
    async (id: string, date: ISODate) => {
      const key = completionKey(id, date)
      if (pendingRef.current.has(key)) return // ignore double clicks
      const wasDone = completionsRef.current.has(key)

      setPendingKey(key, true)
      setKey(key, !wasDone)
      try {
        if (wasDone) await api.removeCompletion(id, date)
        else await api.addCompletion(id, date)
      } catch (e) {
        setKey(key, wasDone)
        toast.error(`Could not save that change. ${errorMessage(e)}`)
      } finally {
        setPendingKey(key, false)
      }
    },
    [toast],
  )

  return { completions, status, error, pending, toggle, reload: load }
}
