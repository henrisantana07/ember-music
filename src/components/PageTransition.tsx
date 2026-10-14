'use client'

import { useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { restartAnimation } from '@/lib/motion-hooks'

const ENTER_CLASS = 'animate-page-enter'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevPath = useRef(pathname)
  const containerRef = useRef<HTMLDivElement>(null)

  // Layout effect, not effect: the class swap has to land before the browser
  // paints the freshly swapped-in page, otherwise the new content shows at
  // full opacity for a frame and then flickers down to 0.
  useLayoutEffect(() => {
    const from = prevPath.current
    const to = pathname

    if (from === to) return
    prevPath.current = to

    const isExplore = to === '/buscar' || to.startsWith('/buscar?')
    if (!isExplore) {
      window.scrollTo(0, 0)
      document.querySelector('.main-container')?.scrollTo(0, 0)
    }

    // The wrapper is never remounted — keying it by pathname would throw
    // away the whole page tree and its state — so React reuses the same DOM
    // node and the keyframe would never re-run. Restart it by hand.
    restartAnimation(containerRef.current, ENTER_CLASS)
  }, [pathname])

  return (
    <div ref={containerRef} className={ENTER_CLASS}>
      {children}
    </div>
  )
}
