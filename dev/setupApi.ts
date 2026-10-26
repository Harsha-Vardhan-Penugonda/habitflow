/**
 * Local setup endpoint for the Vite DEV SERVER (never part of the built app).
 *
 * A web page cannot write files on your computer, but the dev server started
 * by `npm run dev` can. The setup screen sends the values you type to
 * POST /__habitflow/setup, and this code then:
 *
 *   1. validates the Supabase URL and publishable key,
 *   2. connects to your Supabase project to prove they are correct,
 *   3. checks the database tables and, if they are missing and you gave a
 *      database connection string, runs supabase/schema.sql,
 *   4. saves the URL and key to .env.local.
 *
 * The database connection string contains your database password. It is used
 * once for step 3, is never written to disk and never reaches the browser bundle.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import pg from 'pg'
import type { Plugin } from 'vite'
import { parseSupabaseConfig } from '../src/lib/configValidation'
import { SETUP_ENDPOINT, type SetupRequest, type SetupResponse, type SetupStep } from '../src/lib/setupTypes'

const TABLES = ['profiles', 'habits', 'habit_completions']
const PASSWORD_PLACEHOLDER = '[YOUR-PASSWORD]'

// ---------------------------------------------------- Pure helpers (tested)

/** "abcd1234" from "https://abcd1234.supabase.co". Null for other hosts. */
export function projectRefFromUrl(url: string): string | null {
  const match = /^([a-z0-9]+)\.supabase\.(co|in)$/i.exec(new URL(url).hostname)
  return match ? match[1].toLowerCase() : null
}

/** The project ref in a direct (db.<ref>.supabase.co) or pooler (user postgres.<ref>) string. */
export function projectRefFromDatabaseUrl(databaseUrl: string): string | null {
  const parsed = new URL(databaseUrl)
  const direct = /^db\.([a-z0-9]+)\.supabase\.(co|in)$/i.exec(parsed.hostname)
  if (direct) return direct[1].toLowerCase()
  const pooler = /^postgres\.([a-z0-9]+)$/i.exec(decodeURIComponent(parsed.username))
  return pooler ? pooler[1].toLowerCase() : null
}

/**
 * Checks the connection string and fills in the password. The Supabase
 * dashboard shows strings with a [YOUR-PASSWORD] placeholder, so beginners
 * can paste it as-is and type the password separately.
 */
export function prepareDatabaseUrl(
  databaseUrl: string,
  password: string,
  projectUrl: string,
): { ok: true; value: string } | { ok: false; message: string } {
  let value = databaseUrl.trim()
  if (value.includes(PASSWORD_PLACEHOLDER)) {
    if (!password) return { ok: false, message: 'Your connection string still contains [YOUR-PASSWORD]. Type your database password in the password box.' }
    value = value.replace(PASSWORD_PLACEHOLDER, encodeURIComponent(password))
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { ok: false, message: 'The database connection string is not valid. Copy it from Supabase → Connect → "Session pooler".' }
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    return { ok: false, message: 'The database connection string should start with postgresql://' }
  }
  if (!parsed.password) {
    return { ok: false, message: 'The connection string has no password. Type your database password in the password box.' }
  }

  const projectRef = projectRefFromUrl(projectUrl)
  const databaseRef = projectRefFromDatabaseUrl(value)
  if (projectRef && databaseRef && projectRef !== databaseRef) {
    return { ok: false, message: `The connection string belongs to a different project (${databaseRef}) than your Project URL (${projectRef}).` }
  }
  return { ok: true, value }
}

/** Sets KEY=value lines in an env file, keeping every other line as it was. */
export function updateEnvFile(existing: string, values: Record<string, string>): string {
  const lines = existing ? existing.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n') : []
  if (lines.length === 0) {
    lines.push('# Created by the HabitFlow setup screen. Never commit this file.')
  }
  for (const [name, value] of Object.entries(values)) {
    const index = lines.findIndex((line) => new RegExp(`^\\s*${name}\\s*=`).test(line))
    if (index >= 0) lines[index] = `${name}=${value}`
    else lines.push(`${name}=${value}`)
  }
  return lines.join('\n') + '\n'
}

// --------------------------------------------------- Talking to Supabase

const isLocalHost = (hostname: string) => ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname)

async function readJson(res: Response): Promise<{ code?: string; message?: string; msg?: string }> {
  try {
    return (await res.json()) as { code?: string; message?: string }
  } catch {
    return {}
  }
}

/** What GET /auth/v1/settings tells us about the project's sign-in rules. */
interface AuthSettings {
  /** True when new users can log in without confirming their email first. */
  mailer_autoconfirm?: boolean
}

/** Proves the URL is a Supabase project, that it accepts the key, and reads its auth settings. */
async function checkCredentials(url: string, key: string): Promise<{ problem: string } | { settings: AuthSettings }> {
  let res: Response
  try {
    res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(10_000) })
  } catch {
    return { problem: `Could not reach ${new URL(url).host}. Check the Project URL and your internet connection. (Free projects pause when unused — restore it in the dashboard.)` }
  }
  if (res.status === 401 || res.status === 403) {
    return { problem: 'Supabase rejected the key. Copy the publishable key again from Project Settings → API Keys, and check it belongs to this project.' }
  }
  if (!res.ok) {
    return { problem: `${new URL(url).host} answered, but it does not look like a Supabase project (HTTP ${res.status}). Check the Project URL.` }
  }
  return { settings: (await readJson(res)) as AuthSettings }
}

type TableState = 'ready' | 'missing' | { error: string }

/**
 * Logged-out requests are not allowed to read the tables (see schema.sql),
 * so "permission denied" proves a table exists, while "not found" means
 * schema.sql has not been run yet.
 */
async function checkTables(url: string, key: string): Promise<TableState> {
  for (const table of TABLES) {
    const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, { headers: { apikey: key }, signal: AbortSignal.timeout(10_000) })
    if (res.ok) continue
    const body = await readJson(res)
    if (body.code === '42501') continue
    if (body.code === 'PGRST205' || body.code === '42P01' || res.status === 404) return 'missing'
    return { error: body.message ?? body.msg ?? `Unexpected answer from Supabase (HTTP ${res.status}).` }
  }
  return 'ready'
}

function databaseErrorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string }
  if (e.code === '28P01') return 'Wrong database password. You can reset it in Supabase → Project Settings → Database.'
  if (e.code === 'ENOTFOUND' || e.code === 'ENETUNREACH' || e.code === 'EHOSTUNREACH' || e.code === 'ETIMEDOUT' || e.code === 'ECONNREFUSED') {
    return 'Could not reach the database. Use the "Session pooler" connection string from Supabase → Connect (the "Direct connection" needs IPv6, which many networks lack).'
  }
  return `Running schema.sql failed: ${e.message ?? String(error)}`
}

async function runSchema(databaseUrl: string, schemaSql: string): Promise<void> {
  const host = new URL(databaseUrl).hostname
  const client = new pg.Client({
    connectionString: databaseUrl,
    // Supabase requires encrypted connections. Its certificates are signed by
    // Supabase's own authority, which Node does not know about, hence `false`.
    ssl: isLocalHost(host) ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  })
  await client.connect()
  try {
    await client.query(schemaSql)
    // Ask the Supabase API to notice the new tables right away.
    await client.query(`notify pgrst, 'reload schema'`)
  } finally {
    await client.end()
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// ------------------------------------------------------------- The steps

export async function runSetup(
  input: SetupRequest,
  files: { schemaPath: string; envPath: string },
): Promise<SetupResponse> {
  const steps: SetupStep[] = []
  const fail = (step: SetupStep) => ({ ok: false, steps: [...steps, step], restarting: false })

  // 1. Validate the format, with the same rules the app uses.
  const config = parseSupabaseConfig({ VITE_SUPABASE_URL: input.url, VITE_SUPABASE_PUBLISHABLE_KEY: input.key })
  if (!config.ok) {
    return fail({ id: 'validate', label: 'Check the values', status: 'error', message: config.issues.map((i) => `${i.variable} ${i.message}`).join(' ') })
  }
  steps.push({ id: 'validate', label: 'Check the values', status: 'ok', message: 'The Project URL and publishable key are in the right format.' })

  // 2. Connect.
  const credentials = await checkCredentials(config.url, config.key)
  if ('problem' in credentials) return fail({ id: 'connect', label: 'Connect to Supabase', status: 'error', message: credentials.problem })
  steps.push({ id: 'connect', label: 'Connect to Supabase', status: 'ok', message: `Connected to ${new URL(config.url).host} and the key was accepted.` })

  // 3. HabitFlow signs people in with just email + password, so Supabase's
  //    "Confirm email" option must be off. Only the dashboard can change it.
  if (credentials.settings.mailer_autoconfirm === false) {
    return fail({
      id: 'email',
      label: 'Sign-in settings',
      status: 'error',
      message:
        'Your values are correct, but "Confirm email" is turned on in Supabase. HabitFlow uses plain email + password sign-up, so turn it off: Authentication → Sign In / Providers → Email → switch off "Confirm email" → Save. Then click "Check & connect" again.',
      link: {
        href: `https://supabase.com/dashboard/project/${projectRefFromUrl(config.url) ?? '_'}/auth/providers`,
        label: 'Open Sign In / Providers',
      },
    })
  }
  steps.push({ id: 'email', label: 'Sign-in settings', status: 'ok', message: 'Email confirmation is off, so new users can sign up and log in right away.' })

  // 4. Database tables.
  let tables: TableState
  try {
    tables = await checkTables(config.url, config.key)
  } catch {
    return fail({ id: 'tables', label: 'Set up the database', status: 'error', message: 'Lost the connection while checking the database tables. Try again.' })
  }
  if (typeof tables === 'object') return fail({ id: 'tables', label: 'Set up the database', status: 'error', message: tables.error })

  if (tables === 'ready') {
    steps.push({ id: 'tables', label: 'Set up the database', status: 'ok', message: 'The HabitFlow tables already exist.' })
  } else {
    if (!input.databaseUrl?.trim()) {
      return fail({
        id: 'tables',
        label: 'Set up the database',
        status: 'error',
        message: 'Your values are correct, but the database tables don\'t exist yet. Add your database connection string and password below so HabitFlow can run supabase/schema.sql for you — or run that file yourself in the Supabase SQL Editor, then try again.',
      })
    }
    const prepared = prepareDatabaseUrl(input.databaseUrl, input.databasePassword ?? '', config.url)
    if (!prepared.ok) return fail({ id: 'tables', label: 'Set up the database', status: 'error', message: prepared.message })
    try {
      await runSchema(prepared.value, readFileSync(files.schemaPath, 'utf8'))
    } catch (error) {
      return fail({ id: 'tables', label: 'Set up the database', status: 'error', message: databaseErrorMessage(error) })
    }
    // The API can take a moment to see new tables.
    for (let attempt = 0; attempt < 5 && tables !== 'ready'; attempt++) {
      await wait(attempt === 0 ? 300 : 1000)
      tables = await checkTables(config.url, config.key).catch(() => 'missing' as const)
    }
    if (tables !== 'ready') {
      return fail({ id: 'tables', label: 'Set up the database', status: 'error', message: 'schema.sql ran, but the tables are not visible yet. Wait a few seconds and click "Check & connect" again.' })
    }
    steps.push({ id: 'tables', label: 'Set up the database', status: 'ok', message: 'Created the tables, security rules and trigger from supabase/schema.sql.' })
  }

  // 5. Save .env.local (only the client-safe values!).
  const existing = existsSync(files.envPath) ? readFileSync(files.envPath, 'utf8') : ''
  const next = updateEnvFile(existing, { VITE_SUPABASE_URL: config.url, VITE_SUPABASE_PUBLISHABLE_KEY: config.key })
  const changed = next !== existing
  if (changed) {
    // Write a moment later so the browser can show the result first: Vite
    // restarts when .env.local changes, and the page then reloads by itself.
    setTimeout(() => writeFileSync(files.envPath, next), 1500)
  }
  steps.push({
    id: 'save',
    label: 'Save to .env.local',
    status: 'ok',
    message: changed ? 'Saved your Project URL and publishable key to .env.local.' : '.env.local already has these values.',
  })
  return { ok: true, steps, restarting: changed }
}

// --------------------------------------------------------- Vite plugin

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk
      if (data.length > 100_000) reject(new Error('Request too large'))
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function habitflowSetupPlugin(): Plugin {
  return {
    name: 'habitflow-setup',
    apply: 'serve', // dev server only — `npm run build` never includes this
    configureServer(server) {
      const root = server.config.root
      const files = {
        schemaPath: path.join(root, 'supabase', 'schema.sql'),
        envPath: path.join(server.config.envDir || root, '.env.local'),
      }

      server.middlewares.use(SETUP_ENDPOINT, async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST.' })
        // Only accept requests from the app's own page. A JSON content type
        // also forces browsers to ask permission (CORS) for cross-site requests,
        // so other websites cannot rewrite your .env.local.
        const origin = req.headers.origin
        const host = req.headers.host
        if (!origin || !host || new URL(origin).host !== host || !req.headers['content-type']?.includes('application/json')) {
          return sendJson(res, 403, { error: 'Forbidden.' })
        }
        try {
          const body = JSON.parse(await readBody(req)) as Partial<SetupRequest>
          const result = await runSetup(
            {
              url: String(body.url ?? ''),
              key: String(body.key ?? ''),
              databaseUrl: body.databaseUrl ? String(body.databaseUrl) : undefined,
              databasePassword: body.databasePassword ? String(body.databasePassword) : undefined,
            },
            files,
          )
          sendJson(res, 200, result)
        } catch (error) {
          sendJson(res, 500, { error: error instanceof Error ? error.message : 'Setup failed.' })
        }
      })
    },
  }
}
