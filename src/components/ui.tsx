/**
 * Small, reusable building blocks used across the app.
 */
import { useId, type ButtonHTMLAttributes, type ComponentProps, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { AlertIcon, CheckIcon } from './icons'

// ---------------------------------------------------------------- Button

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400',
  secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-500 disabled:bg-rose-400',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, disabled, className = '', children, type = 'button', ...props }: ButtonProps) {
  const sizing = size === 'sm' ? 'h-8 px-3 text-sm gap-1.5' : 'h-10 px-4 text-sm gap-2'
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${sizing} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}

// --------------------------------------------------------------- Spinner

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} aria-hidden="true" />
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner className="size-6 text-indigo-600" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------- Form fields

interface FieldWrapperProps {
  label: string
  id: string
  error?: string
  hint?: ReactNode
  optional?: boolean
  children: ReactNode
}

function FieldWrapper({ label, id, error, hint, optional, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-slate-700">
        {label}
        {optional && <span className="text-xs font-normal text-slate-400">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-rose-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

const inputClasses = (error?: string) =>
  `block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
    error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20'
  }`

interface TextFieldProps extends ComponentProps<'input'> {
  label: string
  error?: string
  hint?: ReactNode
  optional?: boolean
}

export function TextField({ label, error, hint, optional, id, ...props }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <FieldWrapper label={label} id={inputId} error={error} hint={hint} optional={optional}>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={inputClasses(error)}
        {...props}
      />
    </FieldWrapper>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: ReactNode
  optional?: boolean
}

export function TextArea({ label, error, hint, optional, id, ...props }: TextAreaProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <FieldWrapper label={label} id={inputId} error={error} hint={hint} optional={optional}>
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`${inputClasses(error)} resize-none`}
        {...props}
      />
    </FieldWrapper>
  )
}

// ------------------------------------------------------- Alerts & states

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: ReactNode }) {
  const tones = {
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${tones[tone]}`}>
      {tone === 'success' ? <CheckIcon className="mt-0.5 size-4 shrink-0" /> : <AlertIcon className="mt-0.5 size-4 shrink-0" />}
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] ${className}`}>{children}</div>
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">{icon}</div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
