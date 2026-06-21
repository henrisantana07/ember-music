'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function Topbar() {
  const [user, setUser] = useState<User | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', data.user.id)
          .single()
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
      }
    })
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

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
  }

  return (
    <header className="h-16 flex items-center justify-between px-6 flex-shrink-0 relative" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="flex-1" />

      <div className="relative" ref={dropdownRef}>
        {user ? (
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 focus-ring rounded-full"
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
          </button>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className="btn-primary text-sm py-2 px-4"
          >
            Entrar
          </button>
        )}

        {showDropdown && user && (
          <div
            className="absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg py-1 z-50"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <div className="px-4 py-2 border-b border-white/5">
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { router.push('/profile'); setShowDropdown(false) }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Perfil
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors"
              style={{ color: 'var(--error)' }}
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
