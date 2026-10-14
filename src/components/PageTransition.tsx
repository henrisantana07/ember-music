'use client'

import { useLayoutEffect, useRef } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import { usePathname } from 'next/navigation'
import { DURATION, EASE } from '@/lib/motion'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevPath = useRef(pathname)
  const controls = useAnimationControls()

  // Layout effect, not effect: the fade has to be *started* before the browser
  // paints the freshly swapped-in page, otherwise the new content shows at
  // full opacity for a frame and then flickers down to zero.
  useLayoutEffect(() => {
    const from = prevPath.current
    const to = pathname
    const navigated = from !== to
    prevPath.current = to

    if (navigated) {
      const isExplore = to === '/buscar' || to.startsWith('/buscar?')
      if (!isExplore) {
        window.scrollTo(0, 0)
        document.querySelector('.main-container')?.scrollTo(0, 0)
      }
    }

    // A keyframe pair rather than a target value: the wrapper is never
    // remounted (keying it by pathname would throw away the whole page tree
    // and its state), so `start({ opacity: 1 })` would be a no-op the second
    // time round because the element is already there.
    void controls.start(
      { opacity: [0, 1] },
      { duration: DURATION.standard, ease: EASE.enter },
    )
  }, [pathname, controls])

  return (
    <motion.div initial={{ opacity: 0 }} animate={controls}>
      {children}
    </motion.div>
  )
}
