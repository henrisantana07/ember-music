'use client'

import type { ReactNode } from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  label?: string
  icon?: ReactNode
  ariaLabel?: string
}

interface SegmentedToggleProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  size?: 'sm' | 'md'
  className?: string
}

const HEIGHTS = { sm: 'h-11', md: 'h-12' } as const

/** M3 segmented button: one explicit control per option, selected state announced. */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className = '',
}: SegmentedToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex items-stretch rounded-full border border-outline overflow-hidden ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            aria-label={option.ariaLabel ?? option.label}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center justify-center gap-1.5 px-5 min-w-[48px] text-label-large font-semibold transition-colors state-layer border-r border-outline last:border-r-0 ${
              HEIGHTS[size]
            } ${selected ? 'bg-[var(--surface-container-highest)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {selected && (
              <svg className="w-5 h-5" style={{ color: 'var(--accent-solid)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
