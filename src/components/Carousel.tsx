'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'

interface CarouselProps {
  children: ReactNode
  className?: string
}

export function Carousel({ children, className = '' }: CarouselProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  function checkScroll() {
    const el = ref.current
    if (!el) return
    setShowLeft(el.scrollLeft > 4)
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  useEffect(() => {
    checkScroll()
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [children])

  function scroll(amount: number) {
    ref.current?.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <div className="relative group/carousel">
      {showLeft && (
        <button
          onClick={() => scroll(-360)}
          className="absolute left-0 top-0 bottom-0 z-10 w-16 flex items-center justify-start pl-1 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300"
          style={{ background: 'linear-gradient(to right, var(--bg-base) 20%, transparent)' }}
          aria-label="Anterior"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm" style={{ background: 'var(--bg-elevated)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </button>
      )}
      <div
        ref={ref}
        className={`flex gap-4 overflow-x-auto hide-scrollbar pb-2 ${className}`}
      >
        {children}
      </div>
      {showRight && (
        <button
          onClick={() => scroll(360)}
          className="absolute right-0 top-0 bottom-0 z-10 w-16 flex items-center justify-end pr-1 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300"
          style={{ background: 'linear-gradient(to left, var(--bg-base) 20%, transparent)' }}
          aria-label="Próximo"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm" style={{ background: 'var(--bg-elevated)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      )}
    </div>
  )
}
