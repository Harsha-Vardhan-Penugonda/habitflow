import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckIcon, CloseIcon, AlertIcon } from '../components/icons'

type ToastKind = 'success' | 'error'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DURATION_MS = { success: 3500, error: 6000 }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++
      // Keep at most 3 toasts on screen.
      setToasts((current) => [...current.slice(-2), { id, kind, message }])
      window.setTimeout(() => dismiss(id), DURATION_MS[kind])
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => show('success', m), error: (m) => show('error', m) }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live makes screen readers announce new toasts. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className="toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg shadow-slate-900/5"
          >
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${
                toast.kind === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {toast.kind === 'success' ? <CheckIcon className="size-3.5" /> : <AlertIcon className="size-3.5" />}
            </span>
            <p className="flex-1 text-slate-700">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-m-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss notification"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside <ToastProvider>')
  return value
}
