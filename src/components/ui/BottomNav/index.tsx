'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  {
    href: '/',
    label: 'Início',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    href: '/search',
    label: 'Buscar',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
  {
    href: '/favorites',
    label: 'Favoritos',
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around px-2 pb-safe"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'rgba(255,255,255,0.06)',
        height: 'var(--bottom-nav-height, 64px)',
      }}
      role="navigation"
      aria-label="Navegação principal"
    >
      {ITEMS.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-md transition-colors relative"
            style={{ minHeight: 'var(--min-touch)', minWidth: 'var(--min-touch)' }}
          >
            {isActive && (
              <span
                className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full"
                style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
              />
            )}
            <svg
              className="w-5 h-5"
              fill={isActive ? 'var(--accent-from)' : 'none'}
              viewBox="0 0 24 24"
              stroke={isActive ? 'var(--accent-from)' : 'currentColor'}
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-disabled)' }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
