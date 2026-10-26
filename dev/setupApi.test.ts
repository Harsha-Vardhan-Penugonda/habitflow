// @vitest-environment node
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepareDatabaseUrl, projectRefFromDatabaseUrl, projectRefFromUrl, runSetup, updateEnvFile } from './setupApi'

const URL_ = 'https://abcdefghijklmnop.supabase.co'
const KEY = 'sb_publishable_AbCdEf123456'

describe('project refs', () => {
  it('reads the ref from the project URL', () => {
    expect(projectRefFromUrl(URL_)).toBe('abcdefghijklmnop')
    expect(projectRefFromUrl('http://127.0.0.1:54321')).toBeNull()
  })

  it('reads the ref from direct and pooler connection strings', () => {
    expect(projectRefFromDatabaseUrl('postgresql://postgres:pw@db.abcdefghijklmnop.supabase.co:5432/postgres')).toBe('abcdefghijklmnop')
    expect(projectRefFromDatabaseUrl('postgresql://postgres.abcdefghijklmnop:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres')).toBe('abcdefghijklmnop')
  })
})

describe('prepareDatabaseUrl', () => {
  const pooler = 'postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'

  it('fills in and URL-encodes the password', () => {
    const result = prepareDatabaseUrl(pooler, 'p@ss/word#1', URL_)
    expect(result).toEqual({ ok: true, value: pooler.replace('[YOUR-PASSWORD]', 'p%40ss%2Fword%231') })
  })

  it('asks for the password when the placeholder is still there', () => {
    expect(prepareDatabaseUrl(pooler, '', URL_)).toMatchObject({ ok: false, message: expect.stringMatching(/password/) })
  })

  it('rejects strings for a different project and non-Postgres URLs', () => {
    expect(prepareDatabaseUrl(pooler, 'pw', 'https://zzzzzzzzzzzzzzzz.supabase.co')).toMatchObject({ ok: false, message: expect.stringMatching(/different project/) })
    expect(prepareDatabaseUrl('https://example.com', 'pw', URL_)).toMatchObject({ ok: false })
    expect(prepareDatabaseUrl('not a url', 'pw', URL_)).toMatchObject({ ok: false })
  })
})

describe('updateEnvFile', () => {
  it('creates a new file with a warning comment', () => {
    expect(updateEnvFile('', { A: '1' })).toBe('# Created by the HabitFlow setup screen. Never commit this file.\nA=1\n')
  })

  it('replaces existing values and keeps everything else', () => {
    const existing = '# mine\nVITE_SUPABASE_URL=old\nOTHER=keep\n'
    expect(updateEnvFile(existing, { VITE_SUPABASE_URL: 'new', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).toBe(
      '# mine\nVITE_SUPABASE_URL=new\nOTHER=keep\nVITE_SUPABASE_PUBLISHABLE_KEY=k\n',
    )
  })
})

describe('runSetup', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  function files() {
    const dir = mkdtempSync(path.join(tmpdir(), 'habitflow-'))
    return { schemaPath: path.join(dir, 'schema.sql'), envPath: path.join(dir, '.env.local') }
  }

  /** Fakes Supabase: auth answers with `authStatus`, tables answer with `tableBody`. */
  function fakeSupabase(authStatus: number, tableBody: { status: number; code?: string }, authSettings: object = { mailer_autoconfirm: true }) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/auth/v1/settings')) return new Response(JSON.stringify(authSettings), { status: authStatus })
        return new Response(JSON.stringify({ code: tableBody.code, message: 'x' }), { status: tableBody.status })
      }),
    )
  }

  it('stops at the first step when the values are malformed', async () => {
    const result = await runSetup({ url: 'nope', key: KEY }, files())
    expect(result.ok).toBe(false)
    expect(result.steps.map((s) => [s.id, s.status])).toEqual([['validate', 'error']])
  })

  it('reports an unreachable project', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const result = await runSetup({ url: URL_, key: KEY }, files())
    expect(result.steps.at(-1)).toMatchObject({ id: 'connect', status: 'error', message: expect.stringMatching(/could not reach/i) })
  })

  it('reports a rejected key', async () => {
    fakeSupabase(401, { status: 200 })
    const result = await runSetup({ url: URL_, key: KEY }, files())
    expect(result.steps.at(-1)).toMatchObject({ id: 'connect', status: 'error', message: expect.stringMatching(/rejected the key/) })
  })

  it('asks to turn off "Confirm email" and links to the setting', async () => {
    fakeSupabase(200, { status: 401, code: '42501' }, { mailer_autoconfirm: false })
    const f = files()
    const result = await runSetup({ url: URL_, key: KEY }, f)
    expect(result.ok).toBe(false)
    expect(result.steps.at(-1)).toMatchObject({
      id: 'email',
      status: 'error',
      message: expect.stringMatching(/Confirm email/),
      link: { href: 'https://supabase.com/dashboard/project/abcdefghijklmnop/auth/providers' },
    })
    expect(existsSync(f.envPath)).toBe(false)
  })

  it('asks for the connection string when the tables are missing', async () => {
    fakeSupabase(200, { status: 404, code: 'PGRST205' })
    const f = files()
    const result = await runSetup({ url: URL_, key: KEY }, f)
    expect(result.ok).toBe(false)
    expect(result.steps.at(-1)).toMatchObject({ id: 'tables', status: 'error', message: expect.stringMatching(/connection string/) })
    expect(existsSync(f.envPath)).toBe(false) // nothing saved until everything works
  })

  it('saves .env.local when everything is correct', async () => {
    vi.useFakeTimers()
    fakeSupabase(200, { status: 401, code: '42501' }) // permission denied = the tables exist
    const f = files()
    const result = await runSetup({ url: `${URL_}/`, key: KEY, databaseUrl: 'never-used' }, f)
    expect(result.ok).toBe(true)
    expect(result.restarting).toBe(true)
    expect(result.steps.map((s) => s.id)).toEqual(['validate', 'connect', 'email', 'tables', 'save'])
    expect(result.steps.every((s) => s.status === 'ok')).toBe(true)

    vi.advanceTimersByTime(2000)
    const saved = readFileSync(f.envPath, 'utf8')
    expect(saved).toContain(`VITE_SUPABASE_URL=${URL_}\n`)
    expect(saved).toContain(`VITE_SUPABASE_PUBLISHABLE_KEY=${KEY}\n`)
    expect(saved).not.toContain('never-used') // the database secret is never written
  })

  it('does not rewrite .env.local (or restart) when nothing changed', async () => {
    fakeSupabase(200, { status: 200 })
    const f = files()
    writeFileSync(f.envPath, updateEnvFile('', { VITE_SUPABASE_URL: URL_, VITE_SUPABASE_PUBLISHABLE_KEY: KEY }))
    const result = await runSetup({ url: URL_, key: KEY }, f)
    expect(result).toMatchObject({ ok: true, restarting: false })
  })
})
