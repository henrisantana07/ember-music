'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

interface CarouselProps {
  children: React.ReactNode[]
  title?: string
  showDots?: boolean
  showArrows?: boolean
  itemWidth?: string
  gap?: string
}

export function Carousel({
  children,
  title,
  showDots = true,
  showArrows = true,
  itemWidth = 'w-40 md:w-48',
  gap = 'gap-3 md:gap-4',
}: CarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalSnaps, setTotalSnaps] = useState(0)

  const updateScrollState = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    const snapIdx = Math.round(el.scrollLeft / (el.clientWidth * 0.8))
    setCurrentIndex(Math.min(snapIdx, totalSnaps - 1))
  }, [totalSnaps])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const items = el.children.length
    const visible = Math.max(1, Math.floor(el.clientWidth / 180))
    setTotalSnaps(Math.max(1, items - visible + 1))
    el.addEventListener('scroll', updateScrollState, { passive: true })
    updateScrollState()
    return () => el.removeEventListener('scroll', updateScrollState)
  }, [children.length, updateScrollState])

  function scroll(dir: 'left' | 'right') {
    const el = containerRef.current
    if (!el) return
    const scrollAmount = el.clientWidth * 0.8
    el.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  if (children.length === 0) return null

  return (
    <section role="region" aria-label={title ?? 'Carrossel'}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg md:text-xl font-bold">{title}</h2>
          {showArrows && (
            <div className="flex items-center gap-1" role="group" aria-label="Navegação do carrossel">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                aria-label="Anterior"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                aria-label="Próximo"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className={`flex ${gap} overflow-x-auto snap-x-mandatory hide-scrollbar pb-1`}
        role="list"
      >
        {children.map((child, i) => (
          <div
            key={i}
            className={`flex-shrink-0 snap-start ${itemWidth}`}
            role="listitem"
          >
            {child}
          </div>
        ))}
      </div>

      {showDots && totalSnaps > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3" role="tablist" aria-label="Indicadores">
          {Array.from({ length: Math.min(totalSnaps, 8) }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const el = containerRef.current
                if (!el) return
                el.scrollTo({ left: i * el.clientWidth * 0.8, behavior: 'smooth' })
              }}
              className="rounded-full transition-all"
              style={{
                width: i === Math.min(currentIndex, 7) ? 20 : 6,
                height: 6,
                backgroundColor: i === Math.min(currentIndex, 7)
                  ? 'var(--text-primary)'
                  : 'var(--text-disabled)',
              }}
              role="tab"
              aria-selected={i === currentIndex}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
