'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { usePlaylistsStore } from '@/lib/playlists-store'

const NAV_ITEMS = [
  { href: '/', label: 'Início', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/search', label: 'Buscar', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { href: '/favorites', label: 'Favoritos', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { playlists, fetchPlaylists } = usePlaylistsStore()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user)
        fetchPlaylists()
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', data.user.id)
          .single()
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
      }
    })
  }, [])

  return (
    <aside className="w-60 bg-surface flex-shrink-0 flex flex-col hidden md:flex" style={{ backgroundColor: 'var(--bg-surface)' }}>
      <div className="p-6">
        <Link href="/">
          <h1 className="text-2xl font-bold">
            <span className="gradient-accent-text">Ember</span>
            <span className="text-primary"> Music</span>
          </h1>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 relative"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                  style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                />
              )}
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          )
        })}

        {playlists.length > 0 && (
          <div className="pt-4 pb-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
              Playlists
            </p>
          </div>
        )}

        {playlists.map((pl) => {
          const isActive = pathname === `/playlists/${pl.id}`
          return (
            <Link
              key={pl.id}
              href={`/playlists/${pl.id}`}
              className="flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors duration-150 relative"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                  style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                />
              )}
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span className="truncate">{pl.name}</span>
            </Link>
          )
        })}
      </nav>

      {user && (
        <div className="p-4 border-t border-white/5">
          <Link
            href="/profile"
            className="flex items-center gap-3 text-sm text-secondary hover:text-primary transition-colors"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
              >
                {user.email?.[0].toUpperCase()}
              </div>
            )}
            <span className="truncate">{user.email?.split('@')[0]}</span>
          </Link>
        </div>
      )}
    </aside>
  )
}
