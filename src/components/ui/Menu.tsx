'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ButtonHTMLAttributes, ComponentPropsWithRef, CSSProperties, KeyboardEvent as ReactKeyboardEvent, Ref } from 'react'

interface MenuTriggerProps {
  ref: Ref<HTMLButtonElement>
  'aria-expanded': boolean
  'aria-haspopup': 'menu'
  onClick: () => void
}

interface MenuPanelProps {
  ref: Ref<HTMLDivElement>
  onKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void
  triggerRect: DOMRect | null
}

/**
 * Dropdown menu with the behaviour M3 menus require: outside-click close,
 * Escape to close (focus returns to the trigger), arrow-key traversal.
 */
export function useMenu() {
  const [open, setOpen] = useState(false)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
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

  const toggle = () => {
    if (!open && triggerRef.current) setTriggerRect(triggerRef.current.getBoundingClientRect())
    setOpen((v) => !v)
  }

  return {
    open,
    close: () => setOpen(false),
    toggle,
    triggerProps: {
      ref: triggerRef,
      'aria-expanded': open,
      'aria-haspopup': 'menu',
      onClick: toggle,
    } satisfies MenuTriggerProps,
    panelProps: {
      ref: panelRef,
      onKeyDown: onPanelKeyDown,
      triggerRect,
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
      className={`w-full text-left px-4 min-h-[48px] text-body-medium flex items-center gap-3 transition-colors state-layer ${
        danger ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'
      } ${className}`}
      {...rest}
    >
      {selected && (
        <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-solid)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {children}
    </button>
  )
}

interface MenuPanelPropsArgs extends ComponentPropsWithRef<'div'> {
  align?: 'left' | 'right'
  placement?: 'top' | 'bottom'
  triggerRect?: DOMRect | null
}

/**
 * Surface that hosts MenuItem rows (elevation + shape tokens).
 * Rendered in a portal with fixed positioning so it is never clipped by an
 * `overflow` ancestor, and auto-flips up/left to stay inside the viewport.
 */
export function MenuPanel({ align = 'right', placement = 'bottom', className = '', children, triggerRect, ref, onKeyDown, ...rest }: MenuPanelPropsArgs) {
  const localRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const setRefs = (node: HTMLDivElement | null) => {
    localRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref && typeof ref === 'object') ref.current = node
  }

  useLayoutEffect(() => {
    const el = localRef.current
    if (!el || !triggerRect) {
      setPos(null)
      return
    }
    const margin = 4
    const h = el.offsetHeight
    const w = el.offsetWidth
    const vh = window.innerHeight
    const vw = window.innerWidth

    let top: number
    if (placement === 'top') {
      top = triggerRect.top - h - margin
      if (top < 8) top = triggerRect.bottom + margin
    } else {
      top = triggerRect.bottom + margin
      if (top + h > vh - 8) {
        const above = triggerRect.top - h - margin
        top = above >= 8 ? above : Math.max(8, vh - 8 - h)
      }
    }

    let left: number
    if (align === 'right') {
      left = triggerRect.right - w
      if (left < 8) left = Math.min(triggerRect.left, vw - w - 8)
      left = Math.max(8, left)
    } else {
      left = triggerRect.left
      if (left + w > vw - 8) left = Math.max(8, vw - w - 8)
    }

    setPos({ top, left })
  }, [triggerRect, placement, align])

  if (typeof document === 'undefined') return null

  const style: CSSProperties = pos
    ? { position: 'fixed', top: pos.top, left: pos.left, zIndex: 80 }
    : { position: 'fixed', top: 0, left: 0, zIndex: 80, visibility: 'hidden' }

  return createPortal(
    <div
      ref={setRefs}
      role="menu"
      onKeyDown={onKeyDown}
      className={`min-w-[200px] py-1 rounded-[var(--shape-large)] bg-[var(--bg-elevated)] border border-outline-variant shadow-elevation-2 overflow-hidden ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </div>,
    document.body
  )
}
