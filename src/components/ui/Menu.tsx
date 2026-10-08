'use client'

import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ComponentPropsWithRef, KeyboardEvent as ReactKeyboardEvent, Ref } from 'react'

interface MenuTriggerProps {
  ref: Ref<HTMLButtonElement>
  'aria-expanded': boolean
  'aria-haspopup': 'menu'
  onClick: () => void
}

interface MenuPanelProps {
  ref: Ref<HTMLDivElement>
  onKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void
}

/**
 * Dropdown menu with the behaviour M3 menus require: outside-click close,
 * Escape to close (focus returns to the trigger), arrow-key traversal.
 */
export function useMenu() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }

    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onDocKeyDown)
    }
  }, [open])

  const onPanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [])
    if (items.length === 0) return
    e.preventDefault()
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === 'ArrowDown'
      ? items[(index + 1) % items.length]
      : items[(index - 1 + items.length) % items.length]
    next.focus()
  }

  return {
    open,
    close: () => setOpen(false),
    toggle: () => setOpen((v) => !v),
    triggerProps: {
      ref: triggerRef,
      'aria-expanded': open,
      'aria-haspopup': 'menu',
      onClick: () => setOpen((v) => !v),
    } satisfies MenuTriggerProps,
    panelProps: {
      ref: panelRef,
      onKeyDown: onPanelKeyDown,
    } satisfies MenuPanelProps,
  }
}

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  danger?: boolean
}

/** Row inside a Menu panel: state layer + M3 list-item metrics. */
export function MenuItem({ selected, danger, className = '', children, ...rest }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`w-full text-left px-4 py-2.5 text-body-medium flex items-center gap-3 transition-colors state-layer ${
        danger ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'
      } ${className}`}
      {...rest}
    >
      {selected && (
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-solid)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {children}
    </button>
  )
}

interface MenuPanelPropsArgs extends ComponentPropsWithRef<'div'> {
  align?: 'left' | 'right'
}

/** Surface that hosts MenuItem rows (elevation + shape tokens). */
export function MenuPanel({ align = 'right', className = '', children, ...rest }: MenuPanelPropsArgs) {
  return (
    <div
      role="menu"
      className={`absolute top-full mt-1 min-w-[200px] py-1 rounded-[var(--shape-large)] bg-[var(--bg-elevated)] border border-outline-variant shadow-elevation-2 z-50 overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
