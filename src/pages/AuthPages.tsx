import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Alert, Button, TextField } from '../components/ui'
import { authErrorMessage, CONFIRM_EMAIL_IS_ON } from '../lib/errors'
import { clearJustConnected, wasJustConnected } from '../lib/onboarding'
import { getSupabase } from '../lib/supabase'
import { LIMITS, validateEmail, validatePassword } from '../lib/validation'

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  // Set by the setup form just before the dev server restarted with the new settings.
  const [justConnected] = useState(wasJustConnected)
  useEffect(() => clearJustConnected(), [])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="[&>span:last-child]:inline" />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
        </div>
        {justConnected && (
          <div className="mb-4">
            <Alert tone="success">
              <p>
                <strong>Your Supabase values are correct.</strong> HabitFlow is connected and your database is ready.
              </p>
            </Alert>
          </div>
        )}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">{children}</div>
        <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Login

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const found = { email: validateEmail(email), password: password ? undefined : 'Password is required.' }
    setErrors(found)
    if (found.email || found.password) return

    setSubmitting(true)
    setFormError(null)
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password })
    setSubmitting(false)
    if (error) setFormError(authErrorMessage(error))
    // On success, onAuthStateChange updates the session and PublicOnlyRoute redirects.
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to keep your streaks going."
      footer={
        <>
          New to HabitFlow?{' '}
          <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
            Create an account
          </Link>
          <span className="mt-2 block">
            Need help connecting Supabase?{' '}
            <Link to="/welcome" className="font-medium text-indigo-600 hover:text-indigo-500">
              Setup guide
            </Link>
          </span>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Button type="submit" className="w-full" loading={submitting}>
          Log in
        </Button>
      </form>
    </AuthShell>
  )
}

// ----------------------------------------------------------------- Signup

export function SignupPage() {
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (field: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    if (errors[field]) setErrors((x) => ({ ...x, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const found = {
      name: values.name.trim().length > LIMITS.displayName ? `Keep it under ${LIMITS.displayName} characters.` : undefined,
      email: validateEmail(values.email),
      password: validatePassword(values.password),
      confirm: values.confirm !== values.password ? 'Passwords do not match.' : undefined,
    }
    setErrors(found)
    if (Object.values(found).some(Boolean)) return

    setSubmitting(true)
    setFormError(null)
    const { data, error } = await getSupabase().auth.signUp({
      email: values.email.trim(),
      password: values.password,
      // Read by the database trigger that creates the user's profile row.
      options: { data: { display_name: values.name.trim() || null } },
    })
    setSubmitting(false)

    if (error) setFormError(authErrorMessage(error))
    // HabitFlow expects "Confirm email" to be off in Supabase, so sign-up
    // returns a session and PublicOnlyRoute takes the user to the dashboard.
    // No session means the setting is still on.
    else if (!data.session) setFormError(CONFIRM_EMAIL_IS_ON)
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start building habits that stick."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <TextField label="Name" optional autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} maxLength={LIMITS.displayName} />
        <TextField label="Email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          hint={`At least ${LIMITS.minPassword} characters.`}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
        />
        <Button type="submit" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
