'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  children: ReactNode
}

const VARIANTS: Record<ButtonVariant, string> = {
  filled: 'bg-[var(--accent-solid)] text-on-accent state-layer state-layer-on-accent border border-transparent',
  tonal: 'bg-[var(--surface-container-highest)] text-[var(--text-primary)] state-layer border border-transparent',
  outlined: 'bg-transparent text-[var(--text-primary)] state-layer border border-outline',
  text: 'bg-transparent text-[var(--accent-solid)] state-layer border border-transparent',
}

const SIZES = {
  sm: 'h-8 px-3 text-label-medium gap-1.5',
  md: 'h-10 px-5 text-label-large gap-2',
} as const

/** M3 button (filled / tonal / outlined / text) with state layer. */
export function Button({ variant = 'filled', size = 'md', className = '', children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-semibold rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
