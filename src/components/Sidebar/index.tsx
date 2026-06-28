'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { usePlaylistsStore } from '@/lib/playlists-store'
import { useArtistsStore } from '@/lib/artists-store'

const NAV_SECTION1 = [
  { href: '/', label: 'Início', outline: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', fill: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/buscar', label: 'Explorar', outline: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z', fill: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z' },
  { href: '/biblioteca', label: 'Biblioteca', outline: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', fill: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
]



export default function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const { playlists, fetchPlaylists } = usePlaylistsStore()
  const { artists, fetchArtists } = useArtistsStore()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user)
        fetchPlaylists()
        fetchArtists()
        await fetchAvatar(data.user.id)
      }
    })

    function onAvatarUpdated() {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) fetchAvatar(data.user.id)
      })
    }
    window.addEventListener('avatar-updated', onAvatarUpdated)
    return () => window.removeEventListener('avatar-updated', onAvatarUpdated)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchAvatar(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    setShowDropdown(false)
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  function NavIcon({ icon, active }: { icon: { outline: string; fill: string }; active: boolean }) {
    return (
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icon.outline} />
      </svg>
    )
  }

  function NavLink({ href, label, icon }: { href: string; label: string; icon: { outline: string; fill: string } }) {
    const active = isActive(href)
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
          collapsed ? 'justify-center py-3 px-2' : ''
        } ${
          active
            ? 'font-bold bg-white/[0.08] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'
        }`}
        title={collapsed ? label : undefined}
      >
        <NavIcon icon={icon} active={active} />
        {!collapsed && <span>{label}</span>}
      </Link>
    )
  }

  const sidebarContent = (
    <>
      <div className="flex-none flex items-center h-14 px-4 gap-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors duration-200"
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          <svg className="w-5 h-5" style={{ color: 'var(--text-primary)' }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>
        {!collapsed && (
          <Link href="/" className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            <span className="gradient-accent-text">Ember</span>
            <span> Music</span>
          </Link>
        )}
      </div>

      <nav className="flex-none px-2 space-y-0.5">
        {NAV_SECTION1.map(item => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={{ outline: item.outline, fill: item.fill }} />
        ))}
      </nav>

      <hr className="mx-4 my-2 border-white/5" />

      {!collapsed && playlists.length > 0 && (
        <div className="flex-none px-2 space-y-0.5">
          <p className="px-3 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-disabled)' }}>
            Sua Biblioteca
          </p>
          <div className="space-y-0.5">
            {playlists.map(pl => {
              const active = pathname === `/playlists/${pl.id}`
              return (
                <Link
                  key={pl.id}
                  href={`/playlists/${pl.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                    active
                      ? 'font-bold bg-white/[0.08] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <span className="truncate">{pl.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <hr className={`mx-4 my-2 border-white/5 ${collapsed ? 'hidden' : ''}`} />

      {!collapsed && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 space-y-0.5">
          {artists.length > 0 && (
            <p className="px-3 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-disabled)' }}>
              Artistas
            </p>
          )}
          {artists.map(artist => {
            const active = pathname === `/artists/${artist.artist_id}`
            return (
              <Link
                key={artist.artist_id}
                href={`/artists/${artist.artist_id}`}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                  active
                    ? 'font-bold bg-white/[0.08] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="relative w-8 h-8 flex-shrink-0">
                  {artist.artist_data?.image ? (
                    <img src={artist.artist_data.image} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {artist.artist_data?.name?.[0] ?? '?'}
                    </div>
                  )}
                </div>
                <span className="truncate">{artist.artist_data?.name ?? 'Artista'}</span>
              </Link>
            )
          })}
          {artists.length === 0 && (
            <div className="px-3 py-8 text-center text-xs" style={{ color: 'var(--text-disabled)' }}>
              Siga artistas para vê-los aqui
            </div>
          )}
        </div>
      )}

      {!collapsed && (
        <div className="flex-none border-t border-white/5 px-2 py-1">
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm transition-colors duration-200 hover:bg-white/[0.06]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}>
                    {user.email?.[0].toUpperCase()}
                  </div>
                )}
                <span className="truncate text-left flex-1">{user.email?.split('@')[0]}</span>
                <svg className="w-4 h-4 transition-transform duration-200" style={{ transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showDropdown && (
                <div
                  className="absolute bottom-full left-0 right-0 mb-1 rounded-lg shadow-lg py-1 z-50 border border-white/5"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <button
                    onClick={() => { router.push('/configuracoes'); setShowDropdown(false) }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors flex items-center gap-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configurações
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors flex items-center gap-2"
                    style={{ color: 'var(--error)' }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sair
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )

  return (
    <>
      <aside
        className={`hidden md:flex flex-col h-full bg-[var(--bg-surface)] border-r border-white/5 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex-shrink-0 ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {sidebarContent}
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around bg-[var(--bg-base)] border-t border-white/10 z-50 md:hidden safe-area-bottom">
 {NAV_SECTION1.map(item => {
          const active = isActive(item.href)
          const isLibrary = item.href === '/biblioteca'
          return (
            <button
              key={item.href}
              onClick={() => {
                if (isLibrary) { setDrawerOpen(true); return }
                window.location.href = item.href
              }}
              className="flex flex-col items-center justify-center gap-0.5 w-full h-full pt-2"
            >
              <svg className={`w-5 h-5 ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={active ? item.fill : item.outline} />
              </svg>
              <span className={`text-[10px] ${active ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-[300px] bg-[var(--bg-surface)] z-50 flex flex-col md:hidden shadow-2xl">
            <div className="flex items-center justify-between h-14 px-4 flex-none">
              <Link href="/" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                <span className="gradient-accent-text">Ember</span>
                <span> Music</span>
              </Link>
              <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors duration-200">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-primary)' }}>
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-none px-2 space-y-0.5">
              {NAV_SECTION1.map(item => (
                <div key={item.href} onClick={() => { setDrawerOpen(false); window.location.href = item.href }}>
                  <NavLink href={item.href} label={item.label} icon={{ outline: item.outline, fill: item.fill }} />
                </div>
              ))}
            </nav>

            <hr className="mx-4 my-2 border-white/5 flex-none" />

            {playlists.length > 0 && (
            <div className="flex-none px-2 space-y-0.5">
              <p className="px-3 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-disabled)' }}>
                Sua Biblioteca
              </p>
                <div className="space-y-0.5">
                  {playlists.map(pl => {
                    const active = pathname === `/playlists/${pl.id}`
                    return (
                      <div key={pl.id} onClick={() => { setDrawerOpen(false); window.location.href = `/playlists/${pl.id}` }}>
                        <Link
                          href={`/playlists/${pl.id}`}
                          aria-current={active ? 'page' : undefined}
                          className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                            active
                              ? 'font-bold bg-white/[0.08] text-[var(--text-primary)]'
                              : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'
                          }`}
                          onClick={() => setDrawerOpen(false)}
                        >
                          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          <span className="truncate">{pl.name}</span>
                        </Link>
                      </div>
                    )
                  })}
                </div>
            </div>
            )}

            <hr className="mx-4 my-2 border-white/5 flex-none" />

            <div className="flex-1 overflow-y-auto scrollbar-thin px-2 space-y-0.5">
              {artists.length > 0 && (
                <p className="px-3 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-disabled)' }}>
                  Artistas
                </p>
              )}
              {artists.map(artist => {
                const active = pathname === `/artists/${artist.artist_id}`
                return (
                  <div key={artist.artist_data?.id ?? artist.artist_id} onClick={() => { setDrawerOpen(false); window.location.href = `/artists/${artist.artist_id}` }}>
                    <Link
                      href={`/artists/${artist.artist_id}`}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                        active
                          ? 'font-bold bg-white/[0.08] text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'
                      }`}
                      onClick={() => setDrawerOpen(false)}
                    >
                      <div className="relative w-8 h-8 flex-shrink-0">
                        {artist.artist_data?.image ? (
                          <img src={artist.artist_data.image} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                            {artist.artist_data?.name?.[0] ?? '?'}
                          </div>
                        )}
                      </div>
                      <span className="truncate">{artist.artist_data?.name ?? 'Artista'}</span>
                    </Link>
                  </div>
                )
              })}
            </div>

            {user && (
              <div className="flex-none border-t border-white/5 px-2 py-1">
                <div className="relative">
                  <button
                    onClick={() => { router.push('/configuracoes'); setDrawerOpen(false) }}
                    className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm transition-colors duration-200 hover:bg-white/[0.06]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}>
                        {user.email?.[0].toUpperCase()}
                      </div>
                    )}
                    <span className="truncate text-left flex-1">{user.email?.split('@')[0]}</span>
                  </button>
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  ) 
}
