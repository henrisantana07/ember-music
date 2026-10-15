'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useReducedMotion } from 'motion/react'
import { LottieLight } from 'lottie-react'
import type { LottieHandle } from 'lottie-react'
import chevron from '@/lib/lottie/chevron.json'
import emptyRecord from '@/lib/lottie/empty-record.json'
import spinner from '@/lib/lottie/spinner.json'

export type LottieName = 'chevron' | 'record' | 'spinner'

/**
 * Bundled rather than fetched. These live in `src` and not in `public` on
 * purpose: a file served from `public` is a request at runtime, which the
 * offline route has no way to guarantee. Imported here they travel inside the
 * same async chunk as the engine, so they arrive together or not at all.
 */
const ANIMATIONS: Record<LottieName, object> = {
  chevron,
  record: emptyRecord,
  spinner,
}

interface LottieGraphicProps {
  name: LottieName
  className?: string
  style?: CSSProperties
  /**
   * Bump to replay from the first frame. The arrow uses this so the chevron
   * leans into every press rather than only when it first appears.
   */
  playKey?: number
  loop?: boolean
  /** Set off by default once the animation has drawn its first frame. */
  autoplay?: boolean
  /**
   * Movement that carries state instead of decorating it.
   *
   * A parked spinner is indistinguishable from a hung app, so this graphic
   * keeps travelling even when the system asks for reduced motion — the one
   * exemption in the set, and the reason the park below is not unconditional.
   */
  essential?: boolean
  /**
   * Paint every shape with `currentColor` so one JSON serves both themes.
   * lottie-web writes the authored colour as a `fill`/`stroke` attribute on
   * the first frame, so this has to watch for that write rather than run once.
   */
  inheritColor?: boolean
  /** Names the graphic for assistive tech; without it the graphic is hidden. */
  ariaLabel?: string
  /** Called once the animation is loaded and the handle is usable. */
  onReady?: () => void
}

/**
 * A Lottie animation, painted in the surrounding `color`.
 *
 * It sits behind a dynamic import (see `LottieLazy`) so the engine never rides
 * along in the initial bundle — carousels are common enough that it would
 * otherwise be paid for on every route, including the ones with no animation.
 */
export default function LottieGraphic({
  name,
  className,
  style,
  playKey = 0,
  loop = false,
  autoplay = true,
  essential = false,
  inheritColor = true,
  ariaLabel,
  onReady,
}: LottieGraphicProps) {
  const reduced = useReducedMotion()
  // A load-time option, so it has to already be right when the engine starts.
  // Nothing loads during SSR (`ssr: false`), which is what makes that safe.
  const active = autoplay && (!reduced || essential)

  const host = useRef<HTMLElement>(null)
  const handle = useRef<LottieHandle>(null)
  const ready = useRef(false)

  // Refs rather than closures, because `ready` fires long after the render
  // that produced it and would otherwise act on a stale preference.
  const activeRef = useRef(active)
  const onReadyRef = useRef(onReady)

  useEffect(() => { activeRef.current = active }, [active])
  useEffect(() => { onReadyRef.current = onReady }, [onReady])

  /**
   * What playback should be doing right now: a fresh pass for a normal
   * preference, or parked on the settled frame when movement is unwelcome.
   *
   * Parking matters — frame 0 of these animations *is* the resting state, so
   * a system asking for reduced motion gets the finished graphic and no travel
   * at all, without a second file to maintain.
   */
  const apply = useCallback(() => {
    const h = handle.current
    if (!h) return
    h.stop()
    if (!activeRef.current) {
      h.seek({ percent: 100 })
      return
    }
    h.play()
  }, [])

  useEffect(() => {
    if (!inheritColor) return
    const el = host.current
    if (!el) return

    const paint = () => {
      for (const path of el.querySelectorAll<SVGPathElement>('path')) {
        const stroke = path.getAttribute('stroke')
        if (stroke && stroke !== 'none' && stroke !== 'currentColor') {
          path.setAttribute('stroke', 'currentColor')
        }
        const fill = path.getAttribute('fill')
        // `fill-opacity: 0` marks a stroke-only shape, and `none` the group
        // paths lottie-web draws to bound a group — filling either would
        // paint something the designer never drew.
        if (fill && fill !== 'none' && fill !== 'currentColor'
          && path.getAttribute('fill-opacity') !== '0') {
          path.setAttribute('fill', 'currentColor')
        }
      }
    }

    paint()
    // In case the first frame lands in the same tick as the mount.
    const frame = requestAnimationFrame(paint)
    const observer = new MutationObserver(paint)
    observer.observe(el, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['fill', 'stroke'],
    })

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [inheritColor, name])

  const subscriptions = useMemo(() => ({
    ready: () => {
      ready.current = true
      apply()
      onReadyRef.current?.()
    },
  }), [apply])

  // Runs for a press, and for a preference that changes after the load.
  // The first play is left to `autoplay`; before `ready` there is no handle
  // to command and nothing to replay anyway.
  useEffect(() => {
    if (!ready.current) return
    apply()
  }, [apply, playKey, active])

  return (
    <LottieLight
      ref={host}
      lottieRef={handle}
      src={ANIMATIONS[name]}
      autoplay={active}
      loop={loop}
      subscriptions={subscriptions}
      className={className}
      style={style}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    />
  )
}
