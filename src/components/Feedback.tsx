import { Link } from 'react-router-dom'
import type { AppError } from '../lib/errors'
import { AlertIcon } from './icons'
import { Button, Card } from './ui'

/**
 * Full-width error panel with a retry button. When the database tables are
 * missing it explains exactly how to fix that, because it is the most common
 * first-time setup mistake.
 */
export function ErrorState({ error, onRetry }: { error: AppError | null; onRetry?: () => void }) {
  if (error?.kind === 'database-not-ready') {
    return (
      <Card className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <AlertIcon className="size-5" />
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <h2 className="text-base font-semibold text-slate-900">Your database needs one more step</h2>
            <p>HabitFlow connected to Supabase, but the tables it needs don't exist yet.</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Open your project in the Supabase dashboard.</li>
              <li>
                Go to <strong>SQL Editor → New query</strong>.
              </li>
              <li>
                Paste the contents of <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">supabase/schema.sql</code> and click{' '}
                <strong>Run</strong>.
              </li>
              <li>Come back here and try again.</li>
            </ol>
            {onRetry && <Button onClick={onRetry}>I ran the script — try again</Button>}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-8 text-center">
      <div className="mx-auto mb-3 grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
        <AlertIcon className="size-5" />
      </div>
      <h2 className="text-base font-semibold text-slate-900">Something went wrong</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{error?.message ?? 'Please try again.'}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  )
}

export function NotFound({ message = "We couldn't find that page." }: { message?: string }) {
  return (
    <Card className="p-10 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">Not found</h1>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      <Link to="/dashboard" className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
        ← Back to dashboard
      </Link>
    </Card>
  )
}
