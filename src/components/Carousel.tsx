'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import { TRANSITION, rowStaggerDelay } from '@/lib/motion'
import { Lottie } from '@/components/ui/LottieLazy'

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

/** A slot in the row, handed back to the row so an arrow press can reach it. */
interface CarouselItemHandle {
  el: HTMLElement
  reveal: (direction: 'left' | 'right') => void
}

interface CarouselApi {
  register: (handle: CarouselItemHandle) => () => void
  /**
   * Held as a ref, not state, so a slot reads the value *at the moment it
   * arrives* rather than the one its props were last rendered with. After
   * three presses to the right, the next card comes in from the right.
   */
  state: { current: CarouselState }
}

const CarouselContext = createContext<CarouselApi | null>(null)

/**
 * How far a card slides in from the edge it was revealed on.
 *
 * ~36% of a 176px card: enough that the eye has something to track, without
 * the card arriving from off-stage.
 */
const REVEAL_OFFSET = 64

interface CarouselProps {
  children: ReactNode
  className?: string
  /** Card width — used to scroll by one card per arrow click. */
  cardWidth?: number
}

export function Carousel({ children, className = '', cardWidth = 176 }: CarouselProps) {
  const ref = useRef<HTMLDivElement>(null)
  const state = useRef<CarouselState>({ direction: 'right', driven: false })
  const items = useRef(new Set<CarouselItemHandle>())
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const api = useMemo<CarouselApi>(() => ({
    register: (handle) => {
      items.current.add(handle)
      return () => { items.current.delete(handle) }
    },
    state,
  }), [])

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

    const delta = direction === 'left' ? -cardWidth : cardWidth

    // Which cards does this click actually carry in? Decided here, from real
    // geometry, instead of waiting to see whether an observer happens to catch
    // the transition — a smooth scroll can deliver its callback with the card
    // already settled, and then there is nothing left to animate.
    const box = el.getBoundingClientRect()
    const width = box.width

    for (const item of items.current) {
      const rect = item.el.getBoundingClientRect()
      const left = rect.left - box.left
      const right = left + rect.width
      const wasIn = right > 0 && left < width
      const willBeIn = right - delta > 0 && left - delta < width
      // A card already hanging off the edge settled the last time it arrived,
      // so it keeps its place rather than replaying the slide.
      if (!wasIn && willBeIn) item.reveal(direction)
    }

    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <CarouselContext.Provider value={api}>
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
 * row has moved a single pixel. The lean itself is a Lottie — a motion graphic
 * the button could not draw on its own — and it replays on every press, so the
 * row feels driven rather than merely scrolled.
 */
function Edge({ direction, onTravel }: EdgeProps) {
  const left = direction === 'left'
  // Bumped on every press so the chevron leans the way the row is about to
  // move each time, not only the first time it appears.
  const [press, setPress] = useState(0)
  // The plain SVG stands in until the engine's chunk has arrived and drawn —
  // the animation opens on that same drawing, so the handover has nothing to
  // show for itself.
  const [drawn, setDrawn] = useState(false)

  return (
    <button
      onClick={() => {
        setPress((n) => n + 1)
        onTravel()
      }}
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
        <span className="relative block h-5 w-5">
          {!drawn && (
            <svg
              className="absolute inset-0 h-full w-full"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={left ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
              />
            </svg>
          )}
          {/* The animation is authored pointing left; the right-hand arrow is
              that same file mirrored, which also mirrors the direction it
              lunges in — one file, both arrows, no pair to keep in step. */}
          <Lottie
            name="chevron"
            loop={false}
            playKey={press}
            onReady={() => setDrawn(true)}
            className="h-5 w-5"
            style={left ? undefined : { transform: 'scaleX(-1)' }}
          />
        </span>
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
 * Two things drive it, and they do not overlap:
 *
 * - The **arrow press** calls straight in, because the row has already worked
 *   out from geometry that this card is the one arriving. That call also
 *   marks the slot visible, so the observer below does not replay the same
 *   slide a frame later.
 * - The **observer** owns what the row cannot predict: the first paint, and
 *   any drag or scrollbar the arrows never touched. It re-arms the moment the
 *   slot leaves the row, which is what lets the slide play again on the next
 *   pass.
 */
export function CarouselItem({ children, className = '', index = 0 }: CarouselItemProps) {
  const api = useContext(CarouselContext)
  const controls = useAnimationControls()
  const ref = useRef<HTMLDivElement>(null)
  const visible = useRef(false)

  const play = useCallback(
    (direction: 'left' | 'right', delay: number) =>
      void controls.start(
        {
          // Keyframes, not plain values: the slot may still be holding the end
          // of the last slide, and this has to start from the edge regardless.
          opacity: [0, 1],
          x: [direction === 'right' ? REVEAL_OFFSET : -REVEAL_OFFSET, 0],
        },
        { ...TRANSITION.reveal, delay },
      ),
    [controls],
  )

  useEffect(() => {
    const el = ref.current
    if (!el || !api) return
    return api.register({
      el,
      reveal: (direction) => {
        visible.current = true
        play(direction, 0)
      },
    })
  }, [api, play])

  useEffect(() => {
    const el = ref.current
    if (!el || !api) return

    // Without an observer there is no reveal to drive — let the card simply be
    // there rather than leave it stuck at opacity 0.
    if (typeof IntersectionObserver === 'undefined') {
      void controls.set({ opacity: 1, x: 0 })
      return
    }

    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) {
        // Off the edge again, which is what arms it for the next pass. The
        // pixels it goes out on are already clipped, so there is nothing to
        // fade — leaving the flag alone keeps the handoff invisible.
        visible.current = false
        return
      }
      if (visible.current) return
      visible.current = true
      play(
        api.state.current.direction,
        // The cascade belongs to the first paint only; a card revealed by a
        // scroll has already waited its turn.
        api.state.current.driven ? 0 : rowStaggerDelay(index),
      )
    }, { threshold: 0.2 })

    io.observe(el)
    return () => io.disconnect()
  }, [api, controls, index, play])

  return (
    <motion.div ref={ref} animate={controls} initial={{ opacity: 0 }} className={className}>
      {children}
    </motion.div>
  )
}
