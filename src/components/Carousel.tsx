'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import { TRANSITION, rowStaggerDelay } from '@/lib/motion'

interface CarouselState {
  /** Which edge freshly-revealed cards should arrive from. */
  direction: 'left' | 'right'
  /**
   * Set once the user drives the carousel. The cascade belongs to the first
   * paint — a card revealed three arrows later has already waited its turn,
   * and re-staggering it there would make every scroll feel late.
   */
  driven: boolean
}

/**
 * Held as a ref, not state, so an item reads the value *at the moment it comes
 * into view* rather than the one its props were last rendered with. After three
 * presses to the right, the next card has to slide in from the right.
 */
const CarouselContext = createContext<{ current: CarouselState }>({
  current: { direction: 'right', driven: false },
})

/** How far a card slides in from the edge it was revealed on. */
const REVEAL_OFFSET = 32

interface CarouselProps {
  children: ReactNode
  className?: string
  /** Card width — used to scroll by one card per arrow click. */
  cardWidth?: number
}

export function Carousel({ children, className = '', cardWidth = 176 }: CarouselProps) {
  const ref = useRef<HTMLDivElement>(null)
  const state = useRef<CarouselState>({ direction: 'right', driven: false })
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  // Everything the check needs is local to the row, so it lives in the effect
  // rather than being rebuilt on every render — the row re-renders whenever a
  // card loads, and `setShowLeft`/`setShowRight` only commit when a value
  // actually flips.
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      setShowLeft(el.scrollLeft > 4)
      setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
    }

    // Scroll fires once a frame at most, but a card whose image just resolved
    // can change `scrollWidth` without any scroll event at all.
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }

    update()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [children])

  function travel(direction: 'left' | 'right') {
    const el = ref.current
    if (!el) return
    state.current.direction = direction
    state.current.driven = true
    el.scrollBy({ left: direction === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' })
  }

  return (
    <CarouselContext.Provider value={state}>
      <div className="relative group/carousel">
        <div
          ref={ref}
          className={`flex gap-4 overflow-x-auto hide-scrollbar pb-2 ${className}`}
        >
          {children}
        </div>

        {showLeft && <Edge direction="left" onTravel={() => travel('left')} />}
        {showRight && <Edge direction="right" onTravel={() => travel('right')} />}
      </div>
    </CarouselContext.Provider>
  )
}

interface EdgeProps {
  direction: 'left' | 'right'
  onTravel: () => void
}

/**
 * The edge control: a scrim that fades the row out under a round button, so
 * the arrow reads even over a bright cover.
 *
 * The scrim's reveal stays in CSS — it is a `:hover` on the whole row, and an
 * inline opacity from motion would beat it permanently. Only the button
 * moves, and it carries no transform of its own to fight.
 *
 * On press the button shrinks and the chevron leans into the direction it is
 * about to travel: a press this frequent has to answer immediately, before the
 * row has moved a single pixel.
 */
function Edge({ direction, onTravel }: EdgeProps) {
  const left = direction === 'left'
  return (
    <button
      onClick={onTravel}
      aria-label={left ? 'Anterior' : 'Próximo'}
      className={`absolute top-0 bottom-0 z-10 w-16 flex items-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 ${
        left ? 'left-0 justify-start pl-1' : 'right-0 justify-end pr-1'
      }`}
      style={{
        background: left
          ? 'linear-gradient(to right, var(--bg-base) 20%, transparent)'
          : 'linear-gradient(to left, var(--bg-base) 20%, transparent)',
      }}
    >
      <motion.span
        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm"
        style={{ background: 'var(--bg-elevated)' }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.86, x: left ? -3 : 3 }}
        transition={TRANSITION.press}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={left ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
          />
        </svg>
      </motion.span>
    </button>
  )
}

interface CarouselItemProps {
  children: ReactNode
  className?: string
  /** Position in the row, for the entrance cascade. */
  index?: number
}

/**
 * One slot in a carousel: it slides in from the edge it was revealed on.
 *
 * Animating the slot rather than the card matters — the card carries the CSS
 * `:hover` lift, and motion writing an inline `transform` would switch that
 * hover off for good (see the note in globals.css). The slot has no transform
 * of its own, so it is free to move.
 *
 * The slot keeps watching itself for the life of the row, so the slide plays
 * on *every* arrow press rather than only the first: it re-arms the moment it
 * leaves the viewport. Nothing replays while it simply sits there, and it
 * never blocks the scroll — it is a transform, so the row keeps moving under
 * it. The direction is read at the instant it enters, never cached, which is
 * what makes the same card come from the right on one press and the left on
 * the next.
 */
export function CarouselItem({ children, className = '', index = 0 }: CarouselItemProps) {
  const state = useContext(CarouselContext)
  const controls = useAnimationControls()
  const ref = useRef<HTMLDivElement>(null)
  const visible = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reveal = () => {
      const { direction, driven } = state.current
      void controls.start(
        {
          // Keyframes, not plain values: the card may still be holding the end
          // of the last slide, and this has to start from the edge regardless.
          opacity: [0, 1],
          x: [direction === 'right' ? REVEAL_OFFSET : -REVEAL_OFFSET, 0],
        },
        {
          ...TRANSITION.enter,
          // The cascade belongs to the first paint only; a card revealed by a
          // scroll has already waited its turn.
          delay: driven ? 0 : rowStaggerDelay(index),
        },
      )
    }

    // Without the observer there is no reveal to drive — let the card simply be
    // there rather than leave it stuck at opacity 0.
    if (typeof IntersectionObserver === 'undefined') {
      void controls.set({ opacity: 1, x: 0 })
      return
    }

    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) {
        // Off the edge again, which is what arms it for the next press. The
        // pixels it goes out on are already clipped, so there is nothing to
        // fade — leaving the flag alone keeps the handoff invisible.
        visible.current = false
        return
      }
      if (visible.current) return
      visible.current = true
      reveal()
    }, { threshold: 0.2 })

    io.observe(el)
    return () => io.disconnect()
  }, [controls, state, index])

  return (
    <motion.div ref={ref} animate={controls} initial={{ opacity: 0 }} className={className}>
      {children}
    </motion.div>
  )
}
