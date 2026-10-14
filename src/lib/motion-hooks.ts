'use client'

import { useCallback } from 'react'
import { useAnimationControls } from 'motion/react'
import { DURATION, EASE, POP, POP_TIMES } from '@/lib/motion'

export interface ConfirmAnimation {
  /** Pass as `animate` on the confirming node (`motion.svg`, `motion.span`…). */
  controls: ReturnType<typeof useAnimationControls>
  /** Call from the click handler, *before* any await. */
  play: () => void
}

/**
 * Plays a one-shot "confirmed" animation in response to an explicit user
 * action.
 *
 * Deliberately not driven by observing the resulting state: values that
 * hydrate from the server (favorites, follow) flip false -> true on load too,
 * and every heart on screen would pop at once when the data arrived.
 *
 * Driven by animation controls rather than a remounting `key` so the node is
 * never torn down mid-click, and so nothing plays before the first `play()` —
 * at rest the node simply sits at its `initial` scale.
 */
export function useConfirmAnimation(): ConfirmAnimation {
  const controls = useAnimationControls()
  const play = useCallback(() => {
    void controls.start(
      { scale: POP },
      { duration: DURATION.standard, ease: EASE.standard, times: [...POP_TIMES] },
    )
  }, [controls])

  return { controls, play }
}
