import { useState, type ChangeEvent, type FormEvent } from 'react'
import { parseSupabaseConfig } from '../lib/configValidation'
import { markWelcomeSeen, setJustConnected } from '../lib/onboarding'
import { SETUP_ENDPOINT, type SetupResponse, type SetupStep } from '../lib/setupTypes'
import { ConnectionStringHelp, DatabasePasswordHelp, ProjectUrlHelp, PublishableKeyHelp, projectRefFrom } from './FieldHelp'
import { AlertIcon, CheckIcon } from './icons'
import { Alert, Button, Spinner, TextField } from './ui'

interface ConnectFormProps {
  initialUrl?: string
  initialKey?: string
}

function StepRow({ step }: { step: SetupStep }) {
  const ok = step.status === 'ok'
  return (
    <li className="flex gap-3">
      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
        {ok ? <CheckIcon className="size-3.5" strokeWidth={3} /> : <AlertIcon className="size-3.5" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{step.label}</p>
        <p className={`text-sm ${ok ? 'text-slate-500' : 'text-rose-700'}`}>{step.message}</p>
        {step.link && (
          <a
            href={step.link.href}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          >
            {step.link.label} ↗
          </a>
        )}
      </div>
    </li>
  )
}

/**
 * Lets students type their Supabase values instead of editing files by hand.
 * The local dev server (dev/setupApi.ts) checks them, creates the database
 * tables if needed and saves .env.local.
 */
export function ConnectForm({ initialUrl = '', initialKey = '' }: ConnectFormProps) {
  const [values, setValues] = useState({ url: initialUrl, key: initialKey, databaseUrl: '', databasePassword: '' })
  const [errors, setErrors] = useState<{ url?: string; key?: string }>({})
  const [running, setRunning] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [result, setResult] = useState<SetupResponse | null>(null)
  const projectRef = projectRefFrom(values.url)

  const set = (field: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    if (field === 'url' || field === 'key') setErrors((x) => ({ ...x, [field]: undefined }))
  }

  if (!import.meta.env.DEV) {
    return (
      <Alert tone="info">
        <p>Automatic setup only works while the app runs with <code>npm run dev</code> on your computer. Follow the manual steps instead.</p>
      </Alert>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setRequestError(null)
    setResult(null)

    // First check the format in the browser, so typos get instant feedback.
    const config = parseSupabaseConfig({ VITE_SUPABASE_URL: values.url, VITE_SUPABASE_PUBLISHABLE_KEY: values.key })
    if (!config.ok) {
      const found: typeof errors = {}
      for (const issue of config.issues) {
        if (issue.variable === 'VITE_SUPABASE_URL') found.url = `This value ${issue.message}`
        else found.key = `This value ${issue.message}`
      }
      setErrors(found)
      return
    }

    setRunning(true)
    try {
      const res = await fetch(SETUP_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'The setup helper is not running. Start the app with "npm run dev" and try again.' : `The setup helper failed (HTTP ${res.status}).`)
      }
      const data = (await res.json()) as SetupResponse
      setResult(data)
      if (data.ok) {
        markWelcomeSeen()
        setJustConnected()
        if (data.restarting) {
          // The dev server restarts to load .env.local and the page reloads by
          // itself. Land on the sign-up page, and reload ourselves as a fallback.
          window.history.replaceState(null, '', '/signup')
          window.setTimeout(() => window.location.reload(), 8000)
        }
      }
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <p className="text-sm text-slate-500">
        Not sure where something is? Open <strong>Where do I find this?</strong> under any field. Once you've entered your Project URL, its links
        open your project directly.
      </p>
      <div className="space-y-5">
        <div className="space-y-2">
          <TextField
            label="Project URL"
            value={values.url}
            onChange={set('url')}
            error={errors.url}
            placeholder="https://abcdefghijklmnop.supabase.co"
            hint="Your project's address. Required."
            autoComplete="off"
            spellCheck={false}
          />
          <ProjectUrlHelp projectRef={projectRef} />
        </div>
        <div className="space-y-2">
          <TextField
            label="Publishable key"
            value={values.key}
            onChange={set('key')}
            error={errors.key}
            placeholder="sb_publishable_..."
            hint="Safe to use in the browser. Required."
            autoComplete="off"
            spellCheck={false}
          />
          <PublishableKeyHelp projectRef={projectRef} />
        </div>
      </div>

      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">Create the database tables automatically</legend>
        <p className="mb-4 text-xs text-slate-500">
          Only needed the first time. Creating tables needs your <strong>database password</strong>, which the publishable key can't do. It is used once
          by your local dev server to run <code>supabase/schema.sql</code> and is <strong>never saved</strong>. Leave these empty if your tables already exist.
        </p>
        <div className="space-y-5">
          <div className="space-y-2">
            <TextField
              label="Database connection string"
              optional
              value={values.databaseUrl}
              onChange={set('databaseUrl')}
              placeholder="postgresql://postgres.abcd...:[YOUR-PASSWORD]@aws-0-...pooler.supabase.com:5432/postgres"
              hint='The "Session pooler" string, pasted exactly as shown.'
              autoComplete="off"
              spellCheck={false}
            />
            <ConnectionStringHelp projectRef={projectRef} />
          </div>
          <div className="space-y-2">
            <TextField
              label="Database password"
              optional
              type="password"
              value={values.databasePassword}
              onChange={set('databasePassword')}
              hint="Fills in [YOUR-PASSWORD]. Never saved."
              autoComplete="off"
            />
            <DatabasePasswordHelp projectRef={projectRef} />
          </div>
        </div>
      </fieldset>

      {requestError && <Alert>{requestError}</Alert>}

      {running && (
        <div role="status" className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Spinner className="size-4 text-indigo-600" />
          Checking your values and connecting to Supabase…
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <ol className="space-y-3 rounded-xl border border-slate-200 bg-white p-4" aria-label="Setup results">
            {result.steps.map((step) => (
              <StepRow key={step.id} step={step} />
            ))}
          </ol>
          {result.ok && (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-semibold">🎉 Your Supabase values are correct and HabitFlow is connected!</p>
              {result.restarting ? (
                <p className="mt-1 flex items-center gap-2">
                  <Spinner className="size-3.5" /> Restarting with your new settings — the page will reload by itself in a moment.
                </p>
              ) : (
                <Button className="mt-3" onClick={() => window.location.assign('/signup')}>
                  Continue to create account
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {!result?.ok && (
        <Button type="submit" loading={running} className="w-full sm:w-auto">
          Check &amp; connect
        </Button>
      )}
    </form>
  )
}
