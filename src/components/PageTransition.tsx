'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevPath = useRef(pathname)

  useEffect(() => {
    const from = prevPath.current
    const to = pathname

    if (from !== to) {
      const isExplore = to === '/buscar' || to.startsWith('/buscar?')
      if (!isExplore) {
        window.scrollTo(0, 0)
        document.querySelector('.main-container')?.scrollTo(0, 0)
      }
      prevPath.current = to
    }
  }, [pathname])

  return (
    <div className="animate-fade-in">
      {children}
    </div>
  )
}
