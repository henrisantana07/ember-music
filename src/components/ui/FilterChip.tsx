'use client'

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { TRANSITION, whileTap } from '@/lib/motion'

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

/**
 * Slot that holds the checkmark so it can grow from nothing instead of
 * appearing at full width — the chip's own width then eases open rather than
 * snapping. It stays mounted at width 0 purely so there is something to
 * interpolate.
 */
function ChipCheck({ selected }: { selected: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      className="inline-flex items-center overflow-hidden flex-none"
      initial={false}
      animate={{ width: selected ? 14 : 0, marginRight: selected ? 6 : 0 }}
      transition={TRANSITION.enter}
    >
      <svg className="w-3.5 h-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </motion.span>
  )
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
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className={`inline-flex items-center h-8 pl-3 pr-3 rounded-full text-label-medium font-medium state-layer border ${
        selected
          ? 'bg-[var(--accent-solid)] text-on-accent border-transparent state-layer-on-accent'
          : 'bg-transparent text-[var(--text-primary)] border-outline hover:bg-state-hover'
      } disabled:opacity-50 ${className}`}
      whileTap={whileTap}
      transition={TRANSITION.press}
    >
      {showCheck && <ChipCheck selected={!!selected} />}
      {children}
    </motion.button>
  )

  if (!onRemove) return chip

  return (
    <span className="inline-flex items-center h-8 rounded-full border border-outline bg-transparent">
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-1.5 h-full pl-3 rounded-l-full text-label-medium font-medium state-layer ${
          selected ? 'text-on-accent bg-[var(--accent-solid)] state-layer-on-accent' : 'text-[var(--text-primary)]'
        }`}
        whileTap={whileTap}
        transition={TRANSITION.press}
      >
        {children}
      </motion.button>
      <span className="w-px self-stretch bg-outline-variant" aria-hidden="true" />
      <motion.button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="inline-flex items-center justify-center h-full px-2.5 rounded-r-full text-[var(--text-secondary)] state-layer hover:text-[var(--text-primary)]"
        whileTap={whileTap}
        transition={TRANSITION.press}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </motion.button>
    </span>
  )
}
