'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saveSearchHistory } from '@/lib/search-history'
import { SearchSuggestions } from '@/components/SearchSuggestions'
import { useUser } from '@/hooks/use-user'
import { useAvatar } from '@/hooks/use-avatar'
import { AnimatePresence, motion } from 'motion/react'
import { popoverVariants } from '@/lib/motion'
import { useSidebarStore } from '@/lib/sidebar-store'
import { useLibraryPreferences } from '@/hooks/use-library-preferences'

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
  const libraryMenuRef = useRef<HTMLDivElement>(null)

  const { user } = useUser()
  const avatarUrl = useAvatar(user?.id)
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed)
  const toggleSidebar = useSidebarStore((s) => s.toggle)
  const immersive = useSidebarStore((s) => s.immersive)
  const { prefs: topLibPrefs, update: updateTopLib } = useLibraryPreferences()
  const homeActive = pathname === '/'

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
// eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchQuery(q)
    }
  }, [searchParams])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const isCtrl = e.ctrlKey || e.metaKey
      if (isCtrl && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (isCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        handleClear()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
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
    <header
      className="h-16 flex items-center justify-center px-6 flex-shrink-0 relative z-[100] border-b border-outline-variant"
      style={{ backgroundColor: 'var(--bg-base)', display: immersive ? 'none' : undefined }}
    >
      {/* Left cluster: sidebar toggle + branding. */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 transition-[left] duration-[var(--motion-duration-standard)] ease-[var(--motion-easing-standard)] ${sidebarCollapsed ? 'left-[14px]' : 'left-2'}`}
      >
        <button
          onClick={toggleSidebar}
          className="h-11 w-11 inline-flex items-center justify-center rounded-full transition-colors hover:bg-state-hover state-layer"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>
        <img src="/branding/icon.svg" alt="" className="w-24 h-20 object-cover pointer-events-none" style={{ filter: 'drop-shadow(0 0 8px rgba(255,106,0,0.4))' }} />
        <Link href="/" className="whitespace-nowrap text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          <span className="gradient-accent-text">Ember</span>
          <span> Music</span>
        </Link>
      </div>

      {/* Spotify-style search cluster with Home pill + Search box + Sort/View menu. */}
      <div className="hidden md:flex items-center gap-2 flex-1 max-w-2xl min-w-0 z-10">
        <Link
          href="/"
          aria-label="Início"
          title="Início"
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors state-layer ${
            homeActive
              ? 'bg-[var(--surface-container-highest)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'
          }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={homeActive ? 2.5 : 2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Link>
        <button
          type="button"
          onClick={() => updateTopLib({ sort: 'recent' })}
          aria-label="Classificar por recentes"
          title="Recentes"
          className="hidden md:inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-state-hover state-layer"
          style={{ color: topLibPrefs.sort === 'recent' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={topLibPrefs.sort === 'recent' ? 2.5 : 2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
          </svg>
        </button>
        <form onSubmit={handleSearch} className="relative min-w-0 flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--text-disabled)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
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
              className="block w-full h-10 pl-10 py-0 leading-none bg-surface-container-highest border-none rounded-full text-sm appearance-none focus:outline-none focus:ring-2 transition-all [&::-webkit-search-cancel-button]:hidden"
              style={{
                paddingRight: searchQuery ? '4.5rem' : '2.75rem',
                color: 'var(--text-primary)',
                '--tw-ring-color': 'var(--accent-solid)',
              } as React.CSSProperties}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Limpar busca"
                className="absolute right-[2rem] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void submitSearch()
              }}
              aria-label="Explorar"
              title="Explorar"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full inline-flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: pathname === '/buscar' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/buscar' ? 2.5 : 2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z" />
              </svg>
            </button>
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

        {/* Classificação + Visualização embedded (Spotify-style embedded, opens downward). */}
        <div className="hidden md:flex flex-shrink-0 relative" ref={libraryMenuRef}>
          <details className="group">
            <summary className="h-11 w-11 inline-flex items-center justify-center rounded-full transition-colors hover:bg-state-hover state-layer cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden" title="Classificação e Visualização" aria-label="Classificação e Visualização">
              <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
              </svg>
            </summary>
            <div
              className="absolute top-full right-0 mt-1 rounded-xl shadow-elevation-2 border border-outline-variant py-1 z-[70] overflow-hidden w-44"
              style={{ backgroundColor: 'var(--bg-elevated)', transformOrigin: 'top right' }}
            >
              <div className="px-2 pt-1 pb-0.5 text-label-small uppercase tracking-widest" style={{ color: 'var(--text-disabled)' }}>Classificar por</div>
              <button type="button" onClick={() => updateTopLib({ sort: 'recent' })} className={`w-full min-h-[34px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 ${topLibPrefs.sort === 'recent' ? 'bg-state-hover text-[var(--accent-solid)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'}`}>
                <span className="flex-1 text-label-medium">Recentes</span>
                {topLibPrefs.sort === 'recent' && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
              <button type="button" onClick={() => updateTopLib({ sort: 'added' })} className={`w-full min-h-[34px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 ${topLibPrefs.sort === 'added' ? 'bg-state-hover text-[var(--accent-solid)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'}`}>
                <span className="flex-1 text-label-medium">Adicionados recentemente</span>
                {topLibPrefs.sort === 'added' && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
              <button type="button" onClick={() => updateTopLib({ sort: 'alphabetical' })} className={`w-full min-h-[34px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 ${topLibPrefs.sort === 'alphabetical' ? 'bg-state-hover text-[var(--accent-solid)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'}`}>
                <span className="flex-1 text-label-medium">Ordem alfabética</span>
                {topLibPrefs.sort === 'alphabetical' && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
              <button type="button" onClick={() => updateTopLib({ sort: 'creator' })} className={`w-full min-h-[34px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 ${topLibPrefs.sort === 'creator' ? 'bg-state-hover text-[var(--accent-solid)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'}`}>
                <span className="flex-1 text-label-medium">Criador</span>
                {topLibPrefs.sort === 'creator' && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
              <div className="px-2 pt-1 pb-0.5 text-label-small uppercase tracking-widest" style={{ color: 'var(--text-disabled)' }}>Ver como</div>
              <div className="grid grid-cols-3 gap-1 px-2 pb-1">
                <button type="button" onClick={() => updateTopLib({ view: 'compact' })} className={`min-h-[32px] inline-flex items-center justify-center rounded-md transition-colors duration-200 ${topLibPrefs.view === 'compact' ? 'bg-state-hover text-[var(--accent-solid)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'}`} aria-label="Compacto">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 12h16M4 16h16" /></svg>
                </button>
                <button type="button" onClick={() => updateTopLib({ view: 'list' })} className={`min-h-[32px] inline-flex items-center justify-center rounded-md transition-colors duration-200 ${topLibPrefs.view === 'list' ? 'bg-state-hover text-[var(--accent-solid)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'}`} aria-label="Lista detalhada">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>
                </button>
                <button type="button" onClick={() => updateTopLib({ view: 'grid' })} className={`min-h-[32px] inline-flex items-center justify-center rounded-md transition-colors duration-200 ${topLibPrefs.view === 'grid' ? 'bg-state-hover text-[var(--accent-solid)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'}`} aria-label="Grade compacta">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg>
                </button>
              </div>
            </div>
          </details>
      </div>
      </div>

      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <button
          onClick={() => router.back()}
          className="hidden md:inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-state-hover state-layer"
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
          className="hidden md:inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-state-hover state-layer"
          style={{ color: 'var(--text-secondary)' }}
          title="Avançar"
          aria-label="Avançar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="relative" ref={dropdownRef}>
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

          <AnimatePresence>
            {showDropdown && user && (
              <motion.div
                key="user-menu"
                className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-elevation-2 border border-outline-variant py-1 z- 50"
                style={{ backgroundColor: 'var(--bg-elevated)', transformOrigin: 'top right' }}
                variants={popoverVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

