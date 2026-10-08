'use client'

import type { ReactNode } from 'react'

interface FilterChipProps {
  selected?: boolean
  onClick?: () => void
  children: ReactNode
  /** M3 selected checkmark. */
  showCheck?: boolean
  /** Turns the chip into an assist chip with a trailing clear button. */
  onRemove?: () => void
  removeLabel?: string
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

/** M3 filter chip: always visible toggle with explicit selected state. */
export function FilterChip({
  selected,
  onClick,
  children,
  showCheck = true,
  onRemove,
  removeLabel = 'Remover filtro',
  ariaLabel,
  disabled,
  className = '',
}: FilterChipProps) {
  const chip = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1.5 h-8 pl-3 pr-3 rounded-full text-label-medium font-medium transition-colors state-layer border ${
        selected
          ? 'bg-[var(--accent-solid)] text-on-accent border-transparent state-layer-on-accent'
          : 'bg-transparent text-[var(--text-primary)] border-outline hover:bg-state-hover'
      } disabled:opacity-50 ${className}`}
    >
      {selected && showCheck && (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {children}
    </button>
  )

  if (!onRemove) return chip

  return (
    <span className="inline-flex items-center h-8 rounded-full border border-outline bg-transparent">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-1.5 h-full pl-3 rounded-l-full text-label-medium font-medium transition-colors state-layer ${
          selected ? 'text-on-accent bg-[var(--accent-solid)] state-layer-on-accent' : 'text-[var(--text-primary)]'
        }`}
      >
        {children}
      </button>
      <span className="w-px self-stretch bg-outline-variant" aria-hidden="true" />
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="inline-flex items-center justify-center h-full px-2.5 rounded-r-full text-[var(--text-secondary)] transition-colors state-layer hover:text-[var(--text-primary)]"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  )
}
