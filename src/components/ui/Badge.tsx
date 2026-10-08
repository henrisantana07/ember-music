'use client'

import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'accent' | 'outline' | 'error' | 'success' | 'warning'

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
  title?: string
}

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--surface-container-highest)] text-[var(--text-secondary)]',
  accent: 'bg-[color-mix(in srgb, var(--accent-solid) 18%, transparent)] text-[var(--accent-solid)]',
  outline: 'border border-outline-variant text-[var(--text-secondary)]',
  error: 'bg-[color-mix(in srgb, var(--error) 18%, transparent)] text-[var(--error)]',
  success: 'bg-[color-mix(in srgb, var(--success) 18%, transparent)] text-[var(--success)]',
  warning: 'bg-[color-mix(in srgb, var(--warning) 18%, transparent)] text-[var(--warning)]',
}

/** M3 badge for metadata such as Lossless / Explicit / HQ. */
export function Badge({ tone = 'neutral', children, className = '', title }: BadgeProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center h-5 px-1.5 rounded-[var(--shape-extra-small)] text-label-small font-semibold uppercase tracking-wide ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
