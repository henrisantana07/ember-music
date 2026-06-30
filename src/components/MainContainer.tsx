'use client'

import { usePathname } from 'next/navigation'

export function MainContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isReproducao = pathname === '/reproducao'

  return (
    <main
      className={`flex-1 overflow-y-auto scrollbar-thin px-4 md:px-6 py-5 flex flex-col ${
        isReproducao ? '' : 'pb-24 md:pb-5'
      }`}
    >
      {children}
    </main>
  )
}
