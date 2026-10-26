/**
 * Turns errors from Supabase (or the network) into messages a user can act on.
 */

interface ErrorLike {
  message?: string
  code?: string
  status?: number
  name?: string
}

export class AppError extends Error {
  kind: 'network' | 'database-not-ready' | 'invalid-key' | 'unknown'
  constructor(message: string, kind: AppError['kind']) {
    super(message)
    this.kind = kind
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  const e = (error ?? {}) as ErrorLike
  const message = e.message ?? String(error)

  // PGRST205 / 42P01: the table does not exist → schema.sql was not run.
  if (e.code === 'PGRST205' || e.code === '42P01' || /could not find the table|relation .* does not exist/i.test(message)) {
    return new AppError(
      'Your database is not set up yet. Run supabase/schema.sql in the Supabase SQL Editor, then reload.',
      'database-not-ready',
    )
  }
  if (/invalid api key|no api key/i.test(message) || e.status === 401) {
    return new AppError(
      'Supabase rejected the API key. Check VITE_SUPABASE_PUBLISHABLE_KEY in your .env.local file and restart the dev server.',
      'invalid-key',
    )
  }
  if (/failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(message) || e.name === 'AuthRetryableFetchError') {
    return new AppError(
      'Could not reach Supabase. Check your internet connection and the VITE_SUPABASE_URL value (is the project paused?).',
      'network',
    )
  }
  return new AppError(message || 'Something went wrong. Please try again.', 'unknown')
}

export function errorMessage(error: unknown): string {
  return toAppError(error).message
}

/** Shown when Supabase still requires email confirmation, which HabitFlow doesn't use. */
export const CONFIRM_EMAIL_IS_ON =
  'Your Supabase project still requires email confirmation. In Supabase go to Authentication → Sign In / Providers → Email, switch off "Confirm email", click Save, then try again.'

/** Friendlier wording for common Supabase Auth errors. */
export function authErrorMessage(error: unknown): string {
  const e = (error ?? {}) as ErrorLike
  const message = e.message ?? ''
  if (e.code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'Incorrect email or password.'
  }
  if (e.code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    // The account was created while "Confirm email" was still on.
    return CONFIRM_EMAIL_IS_ON
  }
  if (e.code === 'user_already_exists' || /already registered/i.test(message)) {
    return 'An account with this email already exists. Try logging in instead.'
  }
  if (e.code === 'over_email_send_rate_limit' || /rate limit/i.test(message)) {
    return 'Too many attempts recently. Please wait a few minutes and try again.'
  }
  if (e.code === 'weak_password') return message || 'That password is too weak.'
  return errorMessage(error)
}

