/**
 * Reads and validates the Supabase settings from environment variables.
 *
 * Vite exposes variables that start with `VITE_` on `import.meta.env`.
 * They are baked into the browser bundle, which is why only client-safe
 * values (the project URL and the publishable/anon key) may be used here.
 */

import { parseSupabaseConfig, type RawEnv } from './configValidation'

export { parseSupabaseConfig, type ConfigIssue, type RawEnv, type SupabaseConfig } from './configValidation'

export const supabaseConfig = parseSupabaseConfig(import.meta.env as RawEnv)
