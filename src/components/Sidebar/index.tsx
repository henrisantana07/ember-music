'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSidebarStore } from '@/lib/sidebar-store'
import { useUser } from '@/hooks/use-user'
import { useAvatar } from '@/hooks/use-avatar'
import { AnimatePresence, motion } from 'motion/react'

const NAV_LINKS = [
  { href: '/', label: 'Início', outline: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/buscar', label: 'Explorar', outline: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z' },
  { href: '/biblioteca', label: 'Biblioteca', outline: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { href: '/biblioteca/local', label: 'Biblioteca Local', outline: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', fill: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { href: '/playlists', label: 'Playlists', outline: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 3 .895 3-2 3 .895 3 2zM9 10l12-3' },
  { href: '/artists', label: 'Artistas', outline: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z' },
  { href: '/albums', label: 'Álbuns', outline: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const collapsed = useSidebarStore((s) => s.collapsed)
  const immersive = useSidebarStore((s) => s.immersive)
  const { user, loading: userLoading } = useUser()
  const avatarUrl = useAvatar(user?.id)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  // Bottom navigation for mobile (when not immersive)
  const bottomNavItems = NAV_LINKS.map((item) => {
    const active = isActive(item.href)
    const isLibrary = item.href === '/biblioteca' || item.href === '/biblioteca/local'
    return (
      <button
        key={item.href}
        onClick={() => {
          if (isLibrary) {
            // toggle drawer open
            useSidebarStore.getState().toggle()
            return
          }
          router.push(item.href)
        }}
        className="flex flex-col items-center justify-center gap-0.5 w-full h-full pt-2"
      >
        <svg
          className={`w-5 h-5 ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.5 : 1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={item.outline} />
        </svg>
        <span className={`text-label-medium ${active ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
          {item.label}
        </span>
      </button>
    )
  })

  // Drawer panel for mobile
  const drawerOpen = useSidebarStore((s) => { var _a; return (_a = s.collapsed) !== null && _a !== void 0 ? _a : false; })

  return (
    <>
      {/* Bottom navigation for mobile (when not immersive) */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around bg-[var(--bg-base)] border-t border-outline-variant z-50 md:hidden safe-area-bottom"
        style={{ display: immersive ? 'none' : undefined }}
      >
        {bottomNavItems}
      </nav>

      {/* Drawer panel for mobile */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer-scrim"
            className="fixed inset-0 bg-scrim backdrop-blur-sm z-40 md:hidden"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
        )}
        {drawerOpen && (
          <motion.aside
            key="drawer-panel"
            className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-[300px] bg-[var(--bg-surface)] z-50 flex flex-col md:hidden shadow-2xl"
            variants={{ hidden: { x: '-100%' }, visible: { x: 0 }, exit: { x: '-100%' }}}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between h-14 px-4 flex-none">
              <Link href="/" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                <span className="gradient-accent-text">Ember</span>
                <span> Music</span>
              </Link>
              <button onClick={() => useSidebarStore.getState().toggle()} className="h-12 w-12 inline-flex items-center justify-center rounded-lg hover:bg-state-hover transition-colors duration-200 state-layer" aria-label="Fechar menu">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-primary)' }}>
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-none px-2 space-y-0.5">
              {NAV_LINKS.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => useSidebarStore.getState().toggle()}
                    className={`flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-body-medium transition-all duration-200 state-layer ${active ? 'font-bold bg-state-hover text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'}`}>
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.outline} />
                    </svg>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <hr className="mx-4 my-2 border-outline-variant flex-none" />

            {/* Playlists section in drawer */}
            { /* Simplified for now - just placeholder */ }

            {/* Artists section in drawer */}
            { /* Simplified for now - just placeholder */ }

            {/* User section in drawer */}
            {user && (
              <div className="flex-none border-t border-outline-variant px-2 py-1">
                <div className="relative">
                  <button className="flex items-center gap-3 w-full px-2 min-h-[48px] rounded-lg text-body-medium transition-colors duration-200 hover:bg-state-hover state-layer" style={{ color: 'var(--text-secondary)' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-label-medium font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}>
                        {user.email?.[0].toUpperCase()}
                      </div>
                    )}
                    <span className="truncate text-left flex-1">{user.email?.split('@')[0]}</span>
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}