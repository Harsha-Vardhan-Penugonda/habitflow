import { useEffect, useState } from 'react'
import { todayISO, type ISODate } from '../lib/dates'

/** Today's local date, which updates by itself when midnight passes. */
export function useToday(): ISODate {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const id = window.setInterval(() => setToday(todayISO()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return today
}
