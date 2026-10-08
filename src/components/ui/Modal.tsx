'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { IconButton } from './IconButton'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
  labelledById?: string
}

/** M3 dialog: scrim + focus trap-lite (Escape closes, focus moves in, aria-modal). */
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-sm', labelledById }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = labelledById ?? `modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--scrim)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full ${maxWidth} rounded-xl p-6 shadow-elevation-3 animate-fade-in outline-none`}
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id={titleId} className="text-title-medium font-bold">{title}</h2>
          <IconButton
            size="lg"
            label="Fechar"
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}
