import type { ReactNode } from 'react'

/** "abcd1234" from "https://abcd1234.supabase.co", otherwise null. */
export function projectRefFrom(url: string): string | null {
  try {
    const match = /^([a-z0-9]+)\.supabase\.(co|in)$/i.exec(new URL(url.trim()).hostname)
    return match ? match[1].toLowerCase() : null
  } catch {
    return null
  }
}

/**
 * A link into the Supabase dashboard. With a known project ref it opens that
 * project directly; otherwise "_" makes Supabase ask which project to open.
 */
function dashboardLink(ref: string | null, path: string) {
  return `https://supabase.com/dashboard/project/${ref ?? '_'}${path}`
}

function Kbd({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-slate-800">{children}</strong>
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-white px-1 py-0.5 font-mono text-[0.85em] text-slate-800 ring-1 ring-slate-200">{children}</code>
}

interface FieldHelpProps {
  title?: string
  link: { href: string; label: string }
  children: ReactNode
}

/** A collapsible "Where do I find this?" guide shown under a form field. */
function FieldHelp({ title = 'Where do I find this?', link, children }: FieldHelpProps) {
  return (
    <details className="group rounded-lg bg-slate-50 text-sm text-slate-600 open:ring-1 open:ring-slate-200">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-indigo-600 hover:text-indigo-500">
        <span className="inline-block transition group-open:rotate-90" aria-hidden="true">
          ›
        </span>
        {title}
      </summary>
      <div className="space-y-3 px-3 pb-3">
        <ol className="list-decimal space-y-1.5 pl-5">{children}</ol>
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          {link.label} ↗
        </a>
      </div>
    </details>
  )
}

export function ProjectUrlHelp({ projectRef }: { projectRef: string | null }) {
  return (
    <FieldHelp link={{ href: dashboardLink(projectRef, '/settings/api'), label: 'Open Data API settings' }}>
      <li>
        Open your project at <Kbd>supabase.com/dashboard</Kbd>.
      </li>
      <li>
        Click <Kbd>Project Settings</Kbd> (the gear icon at the bottom of the left sidebar), then <Kbd>Data API</Kbd>.
      </li>
      <li>
        Copy the <Kbd>Project URL</Kbd>. It looks like <Code>https://abcdefghijklmnop.supabase.co</Code>.
      </li>
      <li>
        Paste just that — without <Code>/rest/v1</Code> or anything else on the end.
      </li>
    </FieldHelp>
  )
}

export function PublishableKeyHelp({ projectRef }: { projectRef: string | null }) {
  return (
    <FieldHelp link={{ href: dashboardLink(projectRef, '/settings/api-keys'), label: 'Open API Keys settings' }}>
      <li>
        In your project, go to <Kbd>Project Settings → API Keys</Kbd>.
      </li>
      <li>
        Under <Kbd>Publishable key</Kbd>, click the copy button. It starts with <Code>sb_publishable_</Code>.
      </li>
      <li>
        No publishable key? Older projects use the <Kbd>Legacy API Keys</Kbd> tab instead: copy the <Kbd>anon</Kbd> <Kbd>public</Kbd> key (a long
        text starting with <Code>eyJ</Code>).
      </li>
      <li className="text-rose-700">
        Never copy the <Kbd>secret</Kbd> key (<Code>sb_secret_</Code>) or the <Kbd>service_role</Kbd> key. They give full access to your database.
      </li>
    </FieldHelp>
  )
}

export function ConnectionStringHelp({ projectRef }: { projectRef: string | null }) {
  return (
    <FieldHelp link={{ href: dashboardLink(projectRef, '?showConnect=true'), label: 'Open the Connect panel' }}>
      <li>
        Open your project and click the <Kbd>Connect</Kbd> button at the top of the page.
      </li>
      <li>
        Choose the <Kbd>Connection String</Kbd> tab (type <Kbd>URI</Kbd>).
      </li>
      <li>
        Under <Kbd>Method</Kbd>, pick <Kbd>Session pooler</Kbd>. It works on every network; the "Direct connection" needs IPv6, which many home
        and school networks don't have.
      </li>
      <li>
        Copy the whole string and paste it as-is, including <Code>[YOUR-PASSWORD]</Code> — HabitFlow fills in your password from the next box. It
        looks like <Code>postgresql://postgres.abcd…:[YOUR-PASSWORD]@aws-0-….pooler.supabase.com:5432/postgres</Code>.
      </li>
    </FieldHelp>
  )
}

export function DatabasePasswordHelp({ projectRef }: { projectRef: string | null }) {
  return (
    <FieldHelp link={{ href: dashboardLink(projectRef, '/database/settings'), label: 'Open database settings' }}>
      <li>
        It's the <Kbd>Database password</Kbd> you typed when you created the project (not your Supabase login password).
      </li>
      <li>
        Forgot it? Go to <Kbd>Project Settings → Database</Kbd> and click <Kbd>Reset database password</Kbd>, then use the new one here. This does
        not change your Project URL or keys.
      </li>
    </FieldHelp>
  )
}
