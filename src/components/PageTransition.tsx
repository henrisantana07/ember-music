'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const prevPath = useRef(pathname)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
    }
  }, [pathname])

  if (!mounted) return <>{children}</>

  return (
    <div key={pathname} className="animate-fade-in">
      {children}
    </div>
  )
}
