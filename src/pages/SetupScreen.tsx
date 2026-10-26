import { useState, type ReactNode } from 'react'
import { ConnectForm } from '../components/ConnectForm'
import { CheckIcon, CopyIcon } from '../components/icons'
import { Logo } from '../components/Logo'
import type { ConfigIssue } from '../lib/env'

const ENV_TEMPLATE = `VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key-here`

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-indigo-600 text-sm font-semibold text-white">{n}</span>
      <div className="min-w-0 flex-1 pb-1">
        <h3 className="font-medium text-slate-900">{title}</h3>
        <div className="mt-1 space-y-2 text-sm text-slate-600">{children}</div>
      </div>
    </li>
  )
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.8em] text-slate-800">{children}</code>
}

/** The step-by-step Supabase setup guide, shared with the welcome screen. */
export function SetupSteps({ className = '' }: { className?: string }) {
  const [copied, setCopied] = useState(false)

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(ENV_TEMPLATE)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be blocked; the text is still visible to copy by hand.
    }
  }

  return (
    <ol className={`${className} space-y-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8`}>
      <Step n={1} title="Create a Supabase project">
        <p>
          Sign in at{' '}
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:text-indigo-500">
            supabase.com/dashboard
          </a>{' '}
          and create a new project (the free plan is fine).
        </p>
      </Step>
      <Step n={2} title="Create the database tables">
        <p>
          In your project open <strong>SQL Editor → New query</strong>, paste the contents of <Code>supabase/schema.sql</Code> from this repository,
          and click <strong>Run</strong>.
        </p>
      </Step>
      <Step n={3} title="Create a .env.local file">
        <p>
          In the project's root folder (next to <Code>package.json</Code>), copy <Code>.env.example</Code> to a new file called <Code>.env.local</Code>:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 font-mono text-xs text-slate-100">
          {'# macOS / Linux\ncp .env.example .env.local\n\n# Windows (Command Prompt)\ncopy .env.example .env.local'}
        </pre>
      </Step>
      <Step n={4} title="Paste in your project's values">
        <p>
          In Supabase, click <strong>Connect</strong> at the top of your project (or go to <strong>Project Settings → API Keys</strong>). Copy the{' '}
          <strong>Project URL</strong> and the <strong>publishable key</strong> into <Code>.env.local</Code>:
        </p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 pr-12 font-mono text-xs text-slate-100">{ENV_TEMPLATE}</pre>
          <button
            type="button"
            onClick={copyTemplate}
            className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label={copied ? 'Copied' : 'Copy template'}
          >
            {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </button>
        </div>
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800">
          Never use a <strong>secret</strong> or <strong>service_role</strong> key here — everything in a <Code>VITE_</Code> variable is visible to anyone who
          opens your site.
        </p>
      </Step>
      <Step n={5} title="Restart the development server">
        <p>
          Vite only reads environment files when it starts. Stop the server with <Code>Ctrl + C</Code> and run <Code>npm run dev</Code> again, then
          refresh this page.
        </p>
      </Step>
    </ol>
  )
}

function GuideCard({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-indigo-600 text-sm font-semibold text-white">{n}</span>
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  )
}

/**
 * The guided setup: create a project, then type its values into a form that
 * checks them, creates the tables and saves .env.local. The manual steps stay
 * available for anyone who prefers (or needs) to do it by hand.
 */
export function SupabaseSetupGuide({ initialUrl, initialKey }: { initialUrl?: string; initialKey?: string }) {
  return (
    <div className="space-y-6">
      <GuideCard n={1} title="Create a free Supabase project">
        <p className="text-sm text-slate-600">
          Sign in at{' '}
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:text-indigo-500">
            supabase.com/dashboard
          </a>{' '}
          and click <strong>New project</strong>. Remember the <strong>database password</strong> you choose — you'll need it below.
        </p>
      </GuideCard>

      <GuideCard n={2} title="Enter your project's details">
        <ConnectForm initialUrl={initialUrl} initialKey={initialKey} />
      </GuideCard>

      <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-slate-700 hover:text-slate-900 sm:px-6">
          <span className="mr-2 inline-block transition group-open:rotate-90">›</span>
          Prefer to set it up by hand?
        </summary>
        <div className="border-t border-slate-100 p-2">
          <SetupSteps className="border-0 shadow-none" />
        </div>
      </details>
    </div>
  )
}

/**
 * Shown instead of the app when the Supabase environment variables are
 * missing or invalid. Nothing here touches the Supabase client.
 */
export function SetupScreen({ issues }: { issues: ConfigIssue[] }) {
  return (
    <div className="min-h-dvh px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Logo className="[&>span:last-child]:inline" />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-slate-900">Let's connect your Supabase project</h1>
        <p className="mt-2 text-slate-600">
          HabitFlow stores your data in <strong>your own</strong> free Supabase project. Fill in the form below and HabitFlow will check your values, set up the database and save them for you.
        </p>

        <div role="alert" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-900">Not connected yet</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-amber-900">
            {issues.map((issue) => (
              <li key={issue.variable}>
                <Code>{issue.variable}</Code> {issue.message}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8">
          <SupabaseSetupGuide />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Stuck? The <strong>Troubleshooting</strong> section of the README covers the most common problems.
        </p>
      </div>
    </div>
  )
}
