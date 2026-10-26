/**
 * Validation for the Supabase settings. This file is plain TypeScript with no
 * browser-only code, so both the app (env.ts) and the local setup endpoint in
 * the Vite dev server (dev/setupApi.ts) can use the same rules.
 */

export interface ConfigIssue {
  variable: string
  message: string
}

export type SupabaseConfig =
  | { ok: true; url: string; key: string }
  | { ok: false; issues: ConfigIssue[] }

export interface RawEnv {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Older Supabase projects call the publishable key the "anon" key. */
  VITE_SUPABASE_ANON_KEY?: string
}

const PLACEHOLDER_PATTERN = /your[-_]?(project|key)|<.*>|changeme/i

/** Decodes the payload of a legacy JWT key (anon / service_role). */
function readJwtRole(key: string): string | null {
  const parts = key.split('.')
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64)) as { role?: unknown }
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

function validateUrl(value: string): string | null {
  if (!value) return 'is missing.'
  if (PLACEHOLDER_PATTERN.test(value)) return 'still contains the placeholder value from .env.example.'

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return 'is not a valid URL. It should look like https://abcdefghijklmnop.supabase.co'
  }

  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) {
    return 'must start with https:// (http:// is only allowed for a local Supabase instance).'
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    return `should only be the project URL, without a path. Try ${url.origin}`
  }
  return null
}

function validateKey(value: string): string | null {
  if (!value) return 'is missing.'
  if (PLACEHOLDER_PATTERN.test(value)) return 'still contains the placeholder value from .env.example.'
  if (value.startsWith('sb_secret_') || readJwtRole(value) === 'service_role') {
    return 'is a SECRET key. Never put secret or service_role keys in frontend code — use the publishable (or anon) key instead, and rotate the secret key if it was ever committed.'
  }
  if (!value.startsWith('sb_publishable_') && readJwtRole(value) !== 'anon') {
    return 'does not look like a Supabase publishable key (sb_publishable_...) or legacy anon key.'
  }
  return null
}

export function parseSupabaseConfig(env: RawEnv): SupabaseConfig {
  const url = (env.VITE_SUPABASE_URL ?? '').trim()
  const publishable = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()
  const anon = (env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  const key = publishable || anon
  const keyVariable = publishable || !anon ? 'VITE_SUPABASE_PUBLISHABLE_KEY' : 'VITE_SUPABASE_ANON_KEY'

  const issues: ConfigIssue[] = []
  const urlProblem = validateUrl(url)
  if (urlProblem) issues.push({ variable: 'VITE_SUPABASE_URL', message: urlProblem })
  const keyProblem = validateKey(key)
  if (keyProblem) issues.push({ variable: keyVariable, message: keyProblem })

  if (issues.length > 0) return { ok: false, issues }
  return { ok: true, url: url.replace(/\/$/, ''), key }
}
