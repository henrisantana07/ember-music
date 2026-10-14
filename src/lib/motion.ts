import type { Transition, Variants } from 'motion/react'
import type { useAnimationControls } from 'motion/react'
import type { CSSProperties } from 'react'

/**
 * React DOM prop names that Motion also declares, with different signatures:
 * its drag and animation callbacks receive Motion's own event objects instead
 * of React's. Any props interface that gets spread onto a `motion.*` element
 * has to `Omit` these, or the spread stops type-checking.
 */
export type MotionDOMPropNames =
  | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragEnter' | 'onDragExit'
  | 'onDragLeave' | 'onDragOver' | 'onDrop'
  | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onTransitionEnd'

/**
 * Single source of motion timing for the app.
 *
 * Every animation reads these instead of hardcoding durations, so the whole
 * surface can be retuned in one place — and so the timings stay in step with
 * the `--motion-*` CSS custom properties that the few remaining CSS-driven
 * bits (the state layer, shimmer) still use.
 */
export const DURATION = {
  /** 100ms — micro feedback, nothing that carries meaning on its own. */
  short: 0.1,
  /** 160ms — exits, popovers, press feedback. */
  fast: 0.16,
  /** 240ms — dialogs, confirmations, content entrance. */
  standard: 0.24,
  /** 320ms — full-height surfaces: the drawer, the expanded player. */
  medium: 0.32,
} as const

/**
 * M3 easings. `enter` decelerates hard (surfaces arrive with weight and
 * settle), `exit` accelerates (surfaces leave without lingering).
 */
export const EASE = {
  enter: [0, 0, 0, 1] as [number, number, number, number],
  exit: [0.3, 0, 1, 1] as [number, number, number, number],
  standard: [0.2, 0, 0, 1] as [number, number, number, number],
  /** Sheets and full-height panels — slides in, settles, never bounces. */
  sheet: [0.32, 0.72, 0, 1] as [number, number, number, number],
} as const

export const TRANSITION = {
  enter: { duration: DURATION.standard, ease: EASE.enter },
  exit: { duration: DURATION.fast, ease: EASE.exit },
  fast: { duration: DURATION.fast, ease: EASE.standard },
  /** Press feedback has to feel instant — anything slower reads as lag. */
  press: { duration: DURATION.short, ease: EASE.standard },
  /**
   * A surface travelling its own width: slower than a popover, and it has to
   * land without overshoot, since the panel is the whole viewport.
   */
  surface: { duration: DURATION.medium, ease: EASE.sheet },
} as const satisfies Record<string, Transition>

/* --- Shared surface variants ------------------------------------------------
   Named `hidden` / `visible` / `exit` so AnimatePresence can drive them by
   name; consumers only decide *whether* the surface is present. */

/** Scrims fade, nothing else. */
export const scrimVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TRANSITION.fast },
  exit: { opacity: 0, transition: TRANSITION.exit },
} as const satisfies Variants

/**
 * Dialog panels rise and settle.
 *
 * Transform only — deliberately no `opacity`. The panel lives *inside* the
 * scrim, whose own opacity already fades the whole subtree; animating opacity
 * here too would multiply the two and make the exit feel abrupt.
 *
 * Related constraint: a panel that carries a `transform` becomes the
 * containing block for `position: fixed` descendants. Nothing inside a modal
 * panel may be `fixed` — anchored overlays (the crop dialog, the cover editor)
 * are rendered as siblings of the scrim, not children of the panel.
 */
export const panelVariants = {
  hidden: { y: 12, scale: 0.97 },
  visible: { y: 0, scale: 1, transition: TRANSITION.enter },
  exit: { y: 8, scale: 0.98, transition: TRANSITION.exit },
} as const satisfies Variants

/** Menus, popovers and suggestion lists drop from their anchor. */
export const popoverVariants = {
  hidden: { opacity: 0, y: -4, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: TRANSITION.fast },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: TRANSITION.exit },
} as const satisfies Variants

/** The mobile navigation drawer. */
export const drawerVariants = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: TRANSITION.enter },
  exit: { x: '-100%', transition: TRANSITION.exit },
} as const satisfies Variants

/**
 * Page and empty-state content, and the toast.
 *
 * Opacity only — never `transform`. Toasts are centred with
 * `left-1/2 -translate-x-1/2`, and a motion-authored transform would overwrite
 * that Tailwind class and throw the toast to the left edge.
 */
export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TRANSITION.fast },
  exit: { opacity: 0, transition: TRANSITION.exit },
} as const satisfies Variants

/* --- List cascade ------------------------------------------------------------ */

/** Rows beyond this index enter immediately — a 200-row list must not feel slow. */
const ROW_STAGGER_CAP = 12
const ROW_STAGGER = 0.03

/** Cascading delay for row `index`, clamped so long lists stay responsive. */
export function rowStaggerDelay(index: number): number {
  return Math.min(index, ROW_STAGGER_CAP) * ROW_STAGGER
}

function staggered(index: number): Transition {
  return { duration: DURATION.fast, ease: EASE.standard, delay: rowStaggerDelay(index) }
}

/**
 * Grid tiles entering as a cascade.
 *
 * Fades only — deliberately no `y`. Motion writes an inline `transform` for
 * whatever it animates, and an inline transform beats the CSS `:hover` lift
 * `.card-hover` applies, switching that hover off for good. Rows that have no
 * CSS transform of their own get `rowVariants` instead and may rise.
 *
 * The index arrives through `custom`, and the variant is a function so the
 * delay belongs to this animation alone: a component-level `transition` would
 * also delay every gesture reverting back into `visible`.
 */
export const cardVariants = {
  hidden: { opacity: 0 },
  visible: (index: number) => ({ opacity: 1, transition: staggered(index) }),
} satisfies Variants

/** Table rows: fade *and* rise. */
export const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (index: number) => ({ opacity: 1, y: 0, transition: staggered(index) }),
} satisfies Variants

/* --- Press feedback ---------------------------------------------------------- */

/** 0.85 -> 1.12 -> 1: M3's confirmation pop, cresting just past full size. */
export const POP = [0.85, 1.12, 1] as [number, number, number]
/** Peak lands a little before the halfway mark so the overshoot reads as a bounce. */
export const POP_TIMES = [0, 0.55, 1] as [number, number, number]

/** Transition for the confirmation pop. */
export const POP_TRANSITION = {
  duration: DURATION.standard,
  ease: EASE.standard,
  times: [...POP_TIMES],
} as const satisfies Transition

/**
 * Props for any node that plays the confirmation pop.
 *
 * Motion writes a CSS `transform`, and on an SVG the user-space origin is the
 * element's box corner unless the transform box is re-anchored to `fill-box`
 * — without it the icon would scale from its top-left. Pass the icon's own
 * `style` here rather than writing it separately: it would otherwise be
 * swallowed by this one.
 */
export function confirmPopProps(
  controls: ReturnType<typeof useAnimationControls>,
  style?: CSSProperties,
) {
  return {
    animate: controls,
    initial: { scale: 1 },
    style: { transformBox: 'fill-box' as const, transformOrigin: 'center', ...style },
  }
}

/**
 * The tactile half of the M3 pressed state (`.state-layer` already handles the
 * opacity half, and stays in CSS because it is a pseudo-element).
 */
export const whileTap = { scale: 0.97 } as const

/** Cards lift a couple of pixels — the cheapest "this is touchable" signal. */
export const cardHover = {
  y: -2,
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
} as const
