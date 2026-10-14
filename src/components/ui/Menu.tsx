'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { popoverVariants, type MotionDOMPropNames } from '@/lib/motion'
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
 *
 * `open` flips false the moment the menu is dismissed — the exit animation is
 * the call site's problem, not this hook's. Wrapping the panel in
 * `<AnimatePresence>` keeps it mounted for that beat, which is why there is no
 * timer here: the old "hold the element for 160ms" machinery existed only to
 * let the CSS class change land before unmounting.
 */
export function useMenu() {
  const [open, setOpen] = useState(false)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const openMenu = useCallback(() => {
    setOpen(true)
    if (triggerRef.current) setTriggerRect(triggerRef.current.getBoundingClientRect())
  }, [])

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close()
    }

    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onDocKeyDown)
    }
  }, [open, close])

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

  const toggle = () => (open ? close() : openMenu())

  return {
    open,
    close,
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

/**
 * `AnimatePresence` + the presence condition, packaged so call sites read as a
 * plain wrapper instead of nesting a second level (which would re-indent every
 * menu they own). The panel's exit is what keeps it mounted after `open` flips.
 */
export function MenuPresence({ open, children }: { open: boolean; children: ReactNode }) {
  return <AnimatePresence>{open ? children : null}</AnimatePresence>
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

/**
 * `ComponentPropsWithRef<'div'>` minus the props Motion redefines with its own
 * signatures (drag/animation callbacks), so spreading the leftovers onto a
 * `motion.div` type-checks.
 */
type MenuPanelDOMProps = Omit<ComponentPropsWithRef<'div'>, MotionDOMPropNames>

interface MenuPanelPropsArgs extends MenuPanelDOMProps {
  align?: 'left' | 'right'
  placement?: 'top' | 'bottom'
  triggerRect?: DOMRect | null
}

/**
 * Surface that hosts MenuItem rows (elevation + shape tokens).
 * Rendered in a portal with fixed positioning so it is never clipped by an
 * `overflow` ancestor, and auto-flips up/left to stay inside the viewport.
 *
 * The entrance/exit variants are driven by an `AnimatePresence` that must
 * wrap `<MenuPanel>` at the call site. Presence context survives the portal,
 * so the panel here still learns it is leaving and plays `exit` before it is
 * removed.
 */
export function MenuPanel({ align = 'right', placement = 'bottom', className = '', children, triggerRect, ref, onKeyDown, ...rest }: MenuPanelPropsArgs) {
  const localRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    localRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref && typeof ref === 'object') ref.current = node
  }, [ref])

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

  // Scale out of the corner the panel is anchored to, so it reads as growing
  // from its trigger rather than from an arbitrary point.
  const transformOrigin = `${placement === 'top' ? 'bottom' : 'top'} ${align === 'right' ? 'right' : 'left'}`

  const style: CSSProperties = pos
    ? { position: 'fixed', top: pos.top, left: pos.left, zIndex: 80, transformOrigin }
    : { position: 'fixed', top: 0, left: 0, zIndex: 80, visibility: 'hidden', transformOrigin }

  return createPortal(
    <motion.div
      ref={setRefs}
      role="menu"
      onKeyDown={onKeyDown}
      className={`min-w-[200px] py-1 rounded-[var(--shape-large)] bg-[var(--bg-elevated)] border border-outline-variant shadow-elevation-2 overflow-hidden ${className}`}
      style={style}
      variants={popoverVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      {...rest}
    >
      {children}
    </motion.div>,
    document.body
  )
}
