import { describe, expect, it } from 'vitest'
import { parseSupabaseConfig } from './env'

const URL = 'https://abcdefghijklmnop.supabase.co'
const KEY = 'sb_publishable_AbCdEf123456'

/** Builds a fake legacy JWT key with the given role. */
function jwt(role: string) {
  const encode = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role, iss: 'supabase' })}.signature`
}

describe('parseSupabaseConfig', () => {
  it('accepts a valid URL and publishable key', () => {
    expect(parseSupabaseConfig({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_PUBLISHABLE_KEY: KEY })).toEqual({ ok: true, url: URL, key: KEY })
  })

  it('trims whitespace and a trailing slash', () => {
    const config = parseSupabaseConfig({ VITE_SUPABASE_URL: ` ${URL}/ `, VITE_SUPABASE_PUBLISHABLE_KEY: ` ${KEY} ` })
    expect(config).toEqual({ ok: true, url: URL, key: KEY })
  })

  it('falls back to the legacy anon key', () => {
    const anon = jwt('anon')
    expect(parseSupabaseConfig({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: anon })).toEqual({ ok: true, url: URL, key: anon })
  })

  it('reports every missing variable', () => {
    const config = parseSupabaseConfig({})
    expect(config.ok).toBe(false)
    if (!config.ok) {
      expect(config.issues.map((i) => i.variable)).toEqual(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'])
      expect(config.issues[0].message).toMatch(/missing/)
    }
  })

  it('rejects the placeholder values from .env.example', () => {
    const config = parseSupabaseConfig({
      VITE_SUPABASE_URL: 'https://your-project-ref.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_your-key-here',
    })
    expect(config.ok).toBe(false)
    if (!config.ok) expect(config.issues.every((i) => /placeholder/.test(i.message))).toBe(true)
  })

  it.each([
    ['not a url', /not a valid URL/],
    ['http://abc.supabase.co', /https/],
    [`${URL}/rest/v1`, /without a path/],
  ])('rejects the URL %s', (value, message) => {
    const config = parseSupabaseConfig({ VITE_SUPABASE_URL: value, VITE_SUPABASE_PUBLISHABLE_KEY: KEY })
    expect(config.ok).toBe(false)
    if (!config.ok) expect(config.issues[0].message).toMatch(message)
  })

  it('allows http for a local Supabase instance', () => {
    expect(parseSupabaseConfig({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: KEY }).ok).toBe(true)
  })

  it.each([['sb_secret_abc123'], [jwt('service_role')]])('refuses privileged keys (%s)', (key) => {
    const config = parseSupabaseConfig({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_PUBLISHABLE_KEY: key })
    expect(config.ok).toBe(false)
    if (!config.ok) expect(config.issues[0].message).toMatch(/SECRET/)
  })

  it('rejects values that are not Supabase keys', () => {
    const config = parseSupabaseConfig({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_PUBLISHABLE_KEY: 'hello' })
    expect(config.ok).toBe(false)
  })
})
