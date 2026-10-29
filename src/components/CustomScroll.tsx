'use client'

import { useEffect, useRef, useState, useCallback, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react'

interface CustomScrollProps {
  children: ReactNode
  /** Classes applied to the inner (scrollable) container. */
  className?: string
  /** Classes applied to the outer wrapper. */
  wrapperClassName?: string
  role?: string
  ariaLabel?: string
}

/**
 * Spotify-style scroll surface: native scrollbar is hidden and a slim, custom
 * thumb is drawn on top. Keeps wheel/touch/keyboard scrolling working through
 * the underlying native container.
 */
export function CustomScroll({
  children,
  className = '',
  wrapperClassName = '',
  role,
  ariaLabel,
}: CustomScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [thumbHeight, setThumbHeight] = useState(0)
  const [thumbTop, setThumbTop] = useState(0)

  const updateThumb = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { clientHeight, scrollHeight, scrollTop } = el
    const ratio = clientHeight / scrollHeight
    if (ratio >= 0.999 || scrollHeight <= clientHeight) {
      setThumbHeight(0)
      return
    }
    const h = Math.max(24, clientHeight * ratio)
    const maxScroll = scrollHeight - clientHeight
    const maxTop = clientHeight - h
    const top = maxScroll > 0 ? (scrollTop / maxScroll) * maxTop : 0
    setThumbHeight(h)
    setThumbTop(top)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateThumb()
    const onScroll = () => updateThumb()
    el.addEventListener('scroll', onScroll, { passive: true })
    let ro: ResizeObserver | null = null
    let mo: MutationObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateThumb)
      ro.observe(el)
    }
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(updateThumb)
      mo.observe(el, { childList: true, subtree: true, attributes: true })
    }
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro?.disconnect()
      mo?.disconnect()
    }
  }, [updateThumb])

  const onTrackClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const track = trackRef.current
    const el = scrollRef.current
    if (!track || !el || e.target !== track) return
    const rect = track.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const thumbH = thumbRef.current?.offsetHeight ?? thumbHeight
    const maxTop = rect.height - thumbH
    const top = Math.max(0, Math.min(maxTop, clickY - thumbH / 2))
    const maxScroll = el.scrollHeight - el.clientHeight
    const ratio = maxTop > 0 ? top / maxTop : 0
    el.scrollTop = ratio * maxScroll
  }

  const onThumbMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    draggingRef.current = true
    const thumb = thumbRef.current
    const move = (ev: globalThis.MouseEvent) => {
      if (!draggingRef.current) return
      const track = trackRef.current
      const el = scrollRef.current
      if (!track || !el) return
      const rect = track.getBoundingClientRect()
      const h = thumb?.offsetHeight ?? thumbHeight
      let top = ev.clientY - rect.top - h / 2
      const maxTop = rect.height - h
      top = Math.max(0, Math.min(maxTop, top))
      const maxScroll = el.scrollHeight - el.clientHeight
      const ratio = maxTop > 0 ? top / maxTop : 0
      el.scrollTop = ratio * maxScroll
    }
    const up = () => {
      draggingRef.current = false
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  return (
    <div className={`relative ${wrapperClassName}`.trim()} role={role} aria-label={ariaLabel}>
      <div ref={scrollRef} className={`h-full overflow-y-auto hide-scrollbar ${className}`.trim()} tabIndex={0}>
        {children}
      </div>
      {thumbHeight > 0 && (
        <div
          ref={trackRef}
          onClick={onTrackClick}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-pointer select-none"
        >
          <div
            ref={thumbRef}
            onMouseDown={onThumbMouseDown}
            className="absolute left-0 right-0 rounded-full bg-[var(--scrollbar-thumb)] hover:bg-[var(--scrollbar-thumb-hover)] transition-colors"
            style={{ height: `${thumbHeight}px`, transform: `translateY(${thumbTop}px)` }}
          />
        </div>
      )}
    </div>
  )
}
