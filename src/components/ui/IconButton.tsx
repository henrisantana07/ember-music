'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'motion/react'
import { TRANSITION, whileTap, type MotionDOMPropNames } from '@/lib/motion'

type Variant = 'standard' | 'tonal' | 'filled'
type Size = 'sm' | 'md' | 'lg'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | MotionDOMPropNames> {
  /** Required: becomes aria-label + title, so icon-only buttons stay announced. */
  label: string
  variant?: Variant
  size?: Size
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  standard: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  tonal: 'bg-[var(--surface-container-highest)] text-[var(--text-primary)]',
  filled: 'bg-[var(--accent-solid)] text-on-accent state-layer-on-accent',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

/** M3 icon button: 48dp container (lg), state layer, mandatory accessible name. */
export function IconButton({ label, variant = 'standard', size = 'md', className = '', title, children, ...rest }: IconButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={title ?? label}
      className={`inline-flex items-center justify-center rounded-full state-layer ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      // The tactile half of the pressed state; `.state-layer` still covers the
      // opacity half. Disabled buttons never receive pointer events, so they
      // cannot press.
      whileTap={whileTap}
      transition={TRANSITION.press}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
