import { useEffect, useRef, type ReactNode } from 'react'
import { CloseIcon } from './icons'
import { Button } from './ui'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
}

/**
 * An accessible modal built on the native <dialog> element, which gives us
 * focus trapping, the Escape key and a backdrop for free.
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal?.()
      // React's autoFocus runs before the dialog is open, so focus manually.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close?.()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
      onClick={(event) => event.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]"
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-m-1.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close dialog"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="text-sm text-slate-600">{message}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
