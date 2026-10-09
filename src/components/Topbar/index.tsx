'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saveSearchHistory } from '@/lib/search-history'
import { SearchSuggestions } from '@/components/SearchSuggestions'
import { useUser } from '@/hooks/use-user'
import { useAvatar } from '@/hooks/use-avatar'

export function Topbar() {
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { user } = useUser()
  const avatarUrl = useAvatar(user?.id)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearchQuery(q)
  }, [searchParams])

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
    router.push('/login')
  }

  function handleClear() {
    setSearchQuery('')
    inputRef.current?.focus()
    if (pathname === '/buscar') {
      router.push('/buscar')
    }
  }

  async function submitSearch(query = searchQuery) {
    const sanitized = query.trim().replace(/\s+/g, ' ')
    if (sanitized) {
      await saveSearchHistory(user, sanitized)
      setSearchFocused(false)
      inputRef.current?.blur()
      router.push(`/buscar?q=${encodeURIComponent(sanitized)}`)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    void submitSearch()
  }

  return (
    <header className="h-16 flex items-center justify-center px-6 flex-shrink-0 relative" style={{ backgroundColor: 'var(--bg-base)' }}>
      <img
        src="/branding/icon.svg"
        alt=""
        className="absolute left-6 top-1/2 -translate-y-1/2 w-24 h-20 object-cover pointer-events-none hidden md:block"
        style={{ filter: 'drop-shadow(0 0 8px rgba(255,106,0,0.4))' }}
      />
      <div className="absolute left-36 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1">
        <button
          onClick={() => router.back()}
          className="h-11 w-11 inline-flex items-center justify-center rounded-full transition-colors hover:bg-state-hover state-layer"
          style={{ color: 'var(--text-secondary)' }}
          title="Voltar"
          aria-label="Voltar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => window.history.forward()}
          className="h-11 w-11 inline-flex items-center justify-center rounded-full transition-colors hover:bg-state-hover state-layer"
          style={{ color: 'var(--text-secondary)' }}
          title="Avançar"
          aria-label="Avançar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSearch} className="w-full max-w-xl relative">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-disabled)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            placeholder="O que você quer ouvir?"
            aria-label="Buscar músicas, álbuns ou artistas"
            className="block w-full h-9 pl-10 pr-10 py-0 rounded-full text-sm leading-none border-none appearance-none focus:outline-none focus:ring-2 transition-all [&::-webkit-search-cancel-button]:hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--accent-solid)',
            } as React.CSSProperties}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
          <SearchSuggestions
            query={searchQuery}
            visible={searchFocused}
            user={user}
            onSearch={(query) => void submitSearch(query)}
            onSelect={() => {
              setSearchQuery('')
              setSearchFocused(false)
              inputRef.current?.blur()
            }}
            onClose={() => setSearchFocused(false)}
            inputRef={inputRef}
          />
      </form>



      <div className="absolute right-6 top-1/2 -translate-y-1/2" ref={dropdownRef}>
        {user ? (
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 focus-ring rounded-full"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
              >
                {user.email?.[0].toUpperCase()}
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className="btn-primary text-label-large min-h-[48px] py-2 px-5"
          >
            Entrar
          </button>
        )}

        {showDropdown && user && (
          <div
            className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-elevation-2 border border-outline-variant py-1 z-50"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <div className="px-4 py-3 border-b border-outline-variant">
              <p className="text-body-medium font-medium truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { router.push('/configuracoes'); setShowDropdown(false) }}
              className="w-full text-left px-4 min-h-[48px] text-body-medium hover:bg-state-hover transition-colors state-layer"
              style={{ color: 'var(--text-secondary)' }}
            >
              Configurações
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 min-h-[48px] text-body-medium hover:bg-state-hover transition-colors state-layer"
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
