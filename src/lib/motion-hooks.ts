'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * How long a surface stays in the DOM after `open` flips to false, so its
 * exit animation can finish. Must be >= the longest `*-out` animation
 * (160ms) plus a small buffer.
 */
export const EXIT_ANIMATION_MS = 200

/**
 * Restarts a CSS animation on a node React is already holding on to.
 *
 * React reuses the same DOM element across renders, so a keyframe with no
 * state dependency only ever runs once at first paint. Dropping the class
 * and forcing a synchronous reflow before re-adding it makes the browser
 * treat the next run as a fresh animation.
 *
 * The removal and re-addition happen in the same task, so no frame is
 * painted in between — there is no visible flicker.
 */
export function restartAnimation(el: HTMLElement | null | undefined, className: string): void {
  if (!el) return
  el.classList.remove(className)
  void el.offsetWidth
  el.classList.add(className)
}

export interface ModalMotion {
  /** True while the dialog should still be rendered (open *or* exiting). */
  visible: boolean
  /** True from the moment `open` flips false until the exit animation ends. */
  closing: boolean
  /** Class for the scrim: swap to play the exit instead of a hard cut. */
  scrimClassName: string
  /** Class for the panel. */
  panelClassName: string
}

/**
 * Enter *and* exit phases for a dialog that is mounted unconditionally and
 * gated by an `open` prop (the pattern every modal in this app uses).
 *
 * Because the parent never unmounts us when `open` goes false, we can keep
 * the panel on screen for one extra beat and animate it out instead of
 * cutting. If some other path unmounts the component outright, the timer is
 * cleaned up and we simply fall back to today's instant close.
 */
export function useModalMotion(open: boolean): ModalMotion {
  const [visible, setVisible] = useState(open)
  const isOnScreen = useRef(open)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Re-opening while an exit is still running. Adjusted during render (the
  // documented "derive state from props" pattern) so the panel never flashes
  // out and back, and so nothing is queued behind a paint.
  if (open && !visible) setVisible(true)

  // Derived, not stored: it has to flip on the very same commit `open` does,
  // and a setState inside the effect would land a frame late.
  const closing = visible && !open

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => {
    if (open) {
      isOnScreen.current = true
      return
    }

    // Nothing rendered, so there is nothing to animate away.
    if (!isOnScreen.current) return

    timer.current = setTimeout(() => {
      isOnScreen.current = false
      timer.current = null
      setVisible(false)
    }, EXIT_ANIMATION_MS)

    return clearTimer
  }, [open, clearTimer])

  return {
    visible,
    closing,
    scrimClassName: closing ? 'modal-scrim-out' : 'modal-scrim-in',
    panelClassName: closing ? 'modal-panel-out' : 'modal-panel-in',
  }
}

export interface ConfirmAnimation {
  /**
   * Pass as `key` on the animated node. It changes on every `play()`, which
   * remounts the node and therefore restarts the keyframe — even if the
   * previous run has not finished.
   */
  key: number
  /** Call from the click handler, *before* any await. */
  play: () => void
}

/**
 * Plays a one-shot "confirmed" animation in response to an explicit user
 * action.
 *
 * Deliberately not driven by observing the resulting state: values that
 * hydrate from the server (favorites, follows) flip false -> true on load
 * too, and every heart on screen would pop at once when the data arrived.
 */
export function useConfirmAnimation(): ConfirmAnimation {
  const [key, setKey] = useState(0)
  const play = useCallback(() => setKey((k) => k + 1), [])
  return { key, play }
}
