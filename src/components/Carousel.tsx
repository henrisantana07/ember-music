'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import { DURATION, EASE, rowStaggerDelay } from '@/lib/motion'

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
  /** Card width — used to scroll by one card per arrow click. */
  cardWidth?: number
}

export function Carousel({ children, cardWidth = 176 }: CarouselProps) {
  const ref = useRef<HTMLDivElement>(null)
  const state = useRef<CarouselState>({ direction: 'right', driven: false })
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function measure() {
    const el = ref.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  // The scroll position is already settled on first paint, so the arrows have
  // to be measured here — a bare `onLoad` on a div never fires for content
  // that arrives with the render.
  useEffect(() => { measure() }, [])

  function travel(direction: 'left' | 'right') {
    const el = ref.current
    if (!el) return
    state.current.direction = direction
    state.current.driven = true
    el.scrollBy({ left: direction === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' })
  }

  return (
    <CarouselContext.Provider value={state}>
      <div className="relative group/car">
        <div
          ref={ref}
          onScroll={measure}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        >
          {children}
        </div>

        {/* Left arrow, pinned to the left edge. Opacity stays in CSS: it is a
            pseudo-class reveal (hidden until the row is hovered), and a motion
            `initial` here would fight it. The scale is Tailwind's, which
            composes with the `-translate-y-1/2` centring. */}
        <button
          onClick={() => travel('left')}
          aria-label="Rolar para a esquerda"
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-elevated shadow-elevation-2 inline-flex items-center justify-center transition-[opacity,transform] duration-200 hover:scale-105 active:scale-95 state-layer ${
            canScrollLeft ? 'opacity-0 group-hover/car:opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right arrow, on the right edge — it used to sit on top of the left
            one, both at `left-0`, and keyed off `canScrollLeft`. */}
        <button
          onClick={() => travel('right')}
          aria-label="Rolar para a direita"
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-elevated shadow-elevation-2 inline-flex items-center justify-center transition-[opacity,transform] duration-200 hover:scale-105 active:scale-95 state-layer ${
            canScrollRight ? 'opacity-0 group-hover/car:opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </CarouselContext.Provider>
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
 * Plays once per card. Re-triggering every time a card crosses the edge would
 * make scrolling feel sticky.
 */
export function CarouselItem({ children, className = '', index = 0 }: CarouselItemProps) {
  const state = useContext(CarouselContext)
  const controls = useAnimationControls()
  const ref = useRef<HTMLDivElement>(null)
  const entered = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || entered.current) return

    const reveal = () => {
      if (entered.current) return
      entered.current = true
      const { direction, driven } = state.current
      const from = direction === 'right' ? REVEAL_OFFSET : -REVEAL_OFFSET
      void controls.start(
        { opacity: [0, 1], x: [from, 0] },
        { duration: DURATION.fast, ease: EASE.standard, delay: driven ? 0 : rowStaggerDelay(index) },
      )
    }

    // Without the observer there is no reveal to drive — let the card simply be
    // there rather than leave it stuck at opacity 0.
    if (typeof IntersectionObserver === 'undefined') {
      void controls.set({ opacity: 1, x: 0 })
      return
    }

    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      io.disconnect()
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
