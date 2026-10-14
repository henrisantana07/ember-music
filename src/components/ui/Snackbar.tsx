'use client'

import { useEffect } from 'react'
import { useModalMotion } from '@/lib/motion-hooks'

interface SnackbarProps {
  open: boolean
  message: string
  action?: { label: string; onClick: () => void }
  onDismiss?: () => void
  tone?: 'default' | 'error'
  durationMs?: number
  className?: string
}

/** M3 snackbar: announced via a polite live region so feedback is not visual-only. */
export function Snackbar({ open, message, action, onDismiss, tone = 'default', durationMs = 4000, className = '' }: SnackbarProps) {
  // Same enter/exit phases as dialogs: toasts used to pop in and vanish with
  // a hard cut, while every other toast in the app slid in.
  const { visible, scrimClassName } = useModalMotion(open)

  useEffect(() => {
    if (!open || !onDismiss) return
    const timer = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timer)
  }, [open, onDismiss, durationMs])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 -translate-x-1/2 bottom-28 z-[70] max-w-[calc(100vw-2rem)] px-4 py-3 rounded-[var(--shape-extra-small)] shadow-elevation-3 flex items-center gap-4 text-body-medium text-[var(--text-primary)] border border-outline-variant ${scrimClassName} ${
        tone === 'error'
          ? 'bg-[color-mix(in srgb, var(--error) 22%, var(--bg-elevated))]'
          : 'bg-[var(--bg-elevated)]'
      } ${className}`}
    >
      <span className="truncate">{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-label-large font-bold uppercase shrink-0 state-layer rounded-full px-2 py-1"
          style={{ color: 'var(--accent-solid)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
