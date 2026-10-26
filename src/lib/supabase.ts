import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from './env'

/**
 * The single Supabase client used by the whole app.
 *
 * It is only created when the configuration is valid. When it is not,
 * App.tsx shows the setup screen instead of rendering anything that
 * would touch this client, so the rest of the code can safely use
 * `getSupabase()` without null checks.
 */
let client: SupabaseClient | null = null

if (supabaseConfig.ok) {
  client = createClient(supabaseConfig.url, supabaseConfig.key, {
    auth: {
      persistSession: true, // keep users logged in across page refreshes
      autoRefreshToken: true,
    },
  })
}

export function getSupabase(): SupabaseClient {
  if (!client) {
    throw new Error('Supabase is not configured. See .env.example and the README.')
  }
  return client
}
