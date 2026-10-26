import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchProfile } from '../lib/api'
import { getSupabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  /** True until we know whether someone is logged in. */
  loading: boolean
  signOut: () => Promise<void>
  /** A friendly name to show in the UI. */
  displayName: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    // 1. Restore a saved session (from localStorage) on first load.
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))

    // 2. Keep in sync with logins, logouts and token refreshes — also in other tabs.
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      return
    }
    let cancelled = false
    fetchProfile(userId)
      .then((p) => !cancelled && setProfile(p))
      // The profile is only used for the greeting, so a failure is not fatal.
      .catch(() => !cancelled && setProfile(null))
    return () => {
      cancelled = true
    }
  }, [userId])

  const signOut = useCallback(async () => {
    const { error } = await getSupabase().auth.signOut()
    // If the network is down, still clear the local session.
    if (error) await getSupabase().auth.signOut({ scope: 'local' })
  }, [])

  const user = session?.user ?? null
  const metadataName = user?.user_metadata?.display_name as string | undefined
  const displayName = profile?.display_name || metadataName || user?.email?.split('@')[0] || 'there'

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signOut,
        displayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
