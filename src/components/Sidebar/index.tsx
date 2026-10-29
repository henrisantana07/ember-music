'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useMemo, useState, useRef } from 'react'
import type { ReactNode } from 'react'
import { usePlaylistsStore } from '@/lib/playlists-store'
import { useArtistsStore } from '@/lib/artists-store'
import { useSidebarStore } from '@/lib/sidebar-store'
import { useUser } from '@/hooks/use-user'
import { useAvatar } from '@/hooks/use-avatar'
import { useLibraryPreferences } from '@/hooks/use-library-preferences'
import { AnimatePresence, motion } from 'motion/react'
import { scrimVariants, drawerVariants, TRANSITION } from '@/lib/motion'
import { FilterChip } from '@/components/ui/FilterChip'
import { SortMenu } from '@/components/ui/SortMenu'
import { SegmentedToggle } from '@/components/ui/SegmentedToggle'
import { SearchBar } from '@/components/ui/ControlToolbar'
import { IconButton } from '@/components/ui/IconButton'
import { CoverImage } from '@/components/ui/CoverImage'
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { buildLibraryItems } from '@/lib/library/types'
import { filterLibraryItems } from '@/lib/library/filterLibraryItems'
import { sortLibraryItems } from '@/lib/library/sortLibraryItems'
import type { LibraryItemType, LibraryView } from '@/lib/library/types'

const NAV_SECTION1 = [
  { href: '/', label: 'Início', outline: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', fill: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/buscar', label: 'Explorar', outline: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z', fill: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z' },
  { href: '/biblioteca', label: 'Biblioteca', outline: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', fill: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { href: '/biblioteca/local', label: 'Biblioteca Local', outline: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', fill: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
]

// Quantidade máxima de itens exibidos no rail recolhido
const RAIL_LIMIT = 5

const TYPE_FILTERS: { value: LibraryItemType; label: string; singular: string }[] = [
  { value: 'playlist', label: 'Playlists', singular: 'Playlist' },
  { value: 'artist', label: 'Artistas', singular: 'Artista' },
]

/**
 * Anything in the rail that has no room once it is minimised.
 *
 * The rail hugs the left edge, so content can only leave and arrive from that
 * side — a card sliding in from the right would clip straight through the
 * icons. Direction is therefore fixed, not derived from anything.
 *
 * No cascade here, unlike lists: a sidebar is not a list, and every row
 * arriving on its own timer reads as lag rather than as order.
 *
 * `initial={false}` keeps the first paint still — the rail should animate in
 * response to the toggle, never on page load.
 */
function RailItem({ show, children, className = '' }: { show: boolean; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          /* `min-w-0` lets the rail content shrink with the aside instead of
             hitting the flex `min-width:auto` floor — so labels ellipsize in
             place while the rail narrows, rather than wrapping (which would
             jump the row height mid-transition) or spilling past the border. */
          className={`min-w-0 ${className}`}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0, transition: TRANSITION.enter }}
          exit={{ opacity: 0, x: -12, transition: TRANSITION.exit }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const VIEW_OPTIONS: { value: LibraryView; ariaLabel: string; icon: ReactNode }[] = [
  {
    value: 'compact',
    ariaLabel: 'Ver como compacto',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 12h16M4 16h16" />
      </svg>
    ),
  },
  {
    value: 'list',
    ariaLabel: 'Ver como lista',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
      </svg>
    ),
  },
  {
    value: 'grid',
    ariaLabel: 'Ver como grade',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
      </svg>
    ),
  },
]

const SORT_OPTIONS = [
  { value: 'recent' as const, label: 'Recentes' },
  { value: 'alphabetical' as const, label: 'Alfabetica' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const collapsed = useSidebarStore((s) => s.collapsed)
  const immersive = useSidebarStore((s) => s.immersive)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const desktopAsideRef = useRef<HTMLElement>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const { playlists, loading: playlistsLoading, fetchPlaylists } = usePlaylistsStore()
  const { artists, loading: artistsLoading, fetchArtists } = useArtistsStore()
  const { user, loading: userLoading } = useUser()
  const avatarUrl = useAvatar(user?.id)
  const { prefs, update: updatePrefs } = useLibraryPreferences()

  // Filtro de tipo: seleção única, removível — clicar no chip ativo limpa (§5.1).
  const [typeFilter, setTypeFilter] = useState<LibraryItemType | null>(null)
  const [query, setQuery] = useState('')

  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    const el = desktopAsideRef.current
    if (!el) return
    const update = () => {
      document.documentElement.style.setProperty('--sidebar-w', `${el.offsetWidth}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [collapsed])

  useEffect(() => {
    if (user) {
      fetchPlaylists()
      fetchArtists()
    }
  }, [user])

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
        className={`flex items-center gap-3 min-h-[48px] rounded-lg text-body-medium transition-all duration-200 state-layer ${
          /* Collapsed rail: nav sits behind `px-2` (8px) inside a 72px aside,
             so the link box is 56px wide. Padding the 20px icon by (56-20)/2
             centres it exactly. `justify-center` would do the same job, but
             `justify-content` is not animatable — it snaps on the first frame
             instead of sliding, so the icon jumps. Padding does animate. */
          collapsed ? 'px-[18px]' : 'px-3'
        } ${
          active
            ? 'font-bold bg-state-hover text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'
        }`}
        title={collapsed ? label : undefined}
      >
        <NavIcon icon={icon} active={active} />
        <RailItem show={!collapsed}>
          <span className="block truncate">{label}</span>
        </RailItem>
      </Link>
    )
  }

  /* Coleção normalizada das stores reais → busca + filtro de tipo + ordenação
     (§5.1/§5.2, funções puras em lib/library). */
  const libraryItems = useMemo(
    () => buildLibraryItems(playlists, artists),
    [playlists, artists],
  )

  const visibleItems = useMemo(() => {
    const filtered = filterLibraryItems(libraryItems, query, typeFilter)
    return sortLibraryItems(filtered, prefs.sort)
  }, [libraryItems, query, typeFilter, prefs.sort])

  const libraryLoading = !userLoading && (playlistsLoading || artistsLoading)

  /* Estados de vazio distintos (§8): sem resultados da busca versus coleção vazia. */
  const noResults = !libraryLoading && visibleItems.length === 0 && (query !== '' || typeFilter !== null)
  const emptyLibrary = !libraryLoading && libraryItems.length === 0

  function renderLibraryRow(item: (typeof libraryItems)[number], compact: boolean) {
    const active = pathname === item.href
    const cover = item.type === 'artist'
      ? 'rounded-full'
      : 'rounded-md'
    return (
      <Link
        key={item.id}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center ${compact ? 'gap-2 h-8 px-3' : 'gap-3 h-[48px] px-2'} rounded-lg text-body-medium transition-all duration-200 state-layer ${
          active
            ? 'font-bold bg-state-hover text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'
        }`}
      >
        {!compact && (
          <span className={`w-10 h-10 overflow-hidden flex-shrink-0 bg-surface-container-highest ${cover}`}>
            {item.imageUrl ? (
              <CoverImage src={item.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-label-medium font-bold" style={{ color: 'var(--text-primary)' }}>
                {item.title.charAt(0).toUpperCase()}
              </span>
            )}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate">{item.title}</span>
          {!compact && item.subtitle && (
            <span className="block truncate text-label-medium" style={{ color: 'var(--text-disabled)' }}>
              {item.subtitle}
            </span>
          )}
        </span>
      </Link>
    )
  }

  const sidebarContent = (
    <>
      <nav className="flex-none px-2 pt-2 space-y-0.5">
        {NAV_SECTION1.map(item => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={{ outline: item.outline, fill: item.fill }} />
        ))}
      </nav>

      <hr className="mx-4 my-2 border-outline-variant" />

      {/* Navegação da biblioteca: as mesmas fontes de dados em modo rail recolhido. */}
      <RailItem show={collapsed} className="flex-1">
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 space-y-0.5">
          {libraryItems.slice(0, RAIL_LIMIT).map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 min-h-[48px] rounded-lg text-body-medium transition-all duration-200 state-layer ${
                  active
                    ? 'font-bold bg-state-hover text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'
                }`}
                title={item.title}
              >
                <span className="w-5 h-5 flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className={`w-5 h-5 object-cover ${item.type === 'artist' ? 'rounded-full' : 'rounded-sm'}`} />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  )}
                </span>
              </Link>
            )
          })}
        </div>
      </RailItem>

      {/* Nova interface da biblioteca — filtros, busca, ordenação e modos de
          visualização operam sobre as stores reais, nunca sobre JSON. */}
      <RailItem show={!collapsed} className="flex-1">
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-none flex items-center justify-between pl-3 pr-1">
            <Link
              href="/biblioteca"
              className="flex-1 min-w-0 h-12 flex items-center truncate text-title-medium font-bold hover:underline"
              style={{ color: 'var(--text-primary)' }}
            >
              Sua Biblioteca
            </Link>
            {/* Criar: reutiliza o fluxo real de criação de playlist (§5.4). */}
            <IconButton
              label="Criar playlist"
              size="md"
              onClick={() => setCreateModalOpen(true)}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
            </IconButton>
          </div>

          <div className="flex-none flex flex-wrap items-center gap-1.5 px-3 pb-1">
            {TYPE_FILTERS.map(filter => (
              <FilterChip
                key={filter.value}
                label-value={filter.label}
                selected={typeFilter === filter.value}
                onClick={() => setTypeFilter(typeFilter === filter.value ? null : filter.value)}
              >
                {filter.label}
              </FilterChip>
            ))}
          </div>

          <div className="flex-none px-3 pb-2">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Buscar na biblioteca"
              className="h-10"
            />
          </div>

          <div className="flex-none flex items-center justify-between gap-1 px-2 pb-2">
            <SegmentedToggle
              size="sm"
              ariaLabel="Modo de visualização"
              options={VIEW_OPTIONS}
              value={prefs.view}
              onChange={(value) => updatePrefs({ view: value })}
            />
            <SortMenu
              options={SORT_OPTIONS}
              value={prefs.sort}
              onChange={(value) => updatePrefs({ sort: value })}
              label="Ordenar"
              className="min-w-0"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2 pb-2 space-y-0.5" role="list" aria-label="Itens da biblioteca">
            {libraryLoading && <LoadingState title="Carregando biblioteca…" />}
            {!libraryLoading && noResults && (
              <EmptyState
                title="Sem resultados"
                description={`Nada encontrado${query ? ` para "${query}"` : ''}.`}
                className="py-8"
                action={{ label: 'Limpar filtros', onClick: () => { setQuery(''); setTypeFilter(null) } }}
              />
            )}
            {!libraryLoading && emptyLibrary && (
              <EmptyState
                title="Biblioteca vazia"
                description="Crie playlists e siga artistas para vê-los aqui."
                className="py-8"
                action={{ label: 'Criar playlist', onClick: () => setCreateModalOpen(true) }}
              />
            )}
            {!libraryLoading && !noResults && !emptyLibrary && visibleItems.map(item => {
              if (prefs.view === 'grid') {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex flex-col gap-1.5 p-2 rounded-lg transition-all duration-200 state-layer ${
                      active
                        ? 'bg-state-hover text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="w-full aspect-square overflow-hidden rounded-md bg-surface-container-highest inline-block">
                      {item.imageUrl ? (
                        <CoverImage src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-title-large font-bold" style={{ color: 'var(--text-primary)' }}>
                          {item.title.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-body-medium">{item.title}</span>
                    <span className="block truncate text-label-medium" style={{ color: 'var(--text-disabled)' }}>
                      {item.type === 'playlist' ? 'Playlist' : 'Artista'}
                    </span>
                  </Link>
                )
              }
              return renderLibraryRow(item, prefs.view === 'compact')
            })}
          </div>
        </div>
      </RailItem>

      <RailItem show={!collapsed} className="flex-none">
        <hr className="mx-4 my-2 border-outline-variant" />
      </RailItem>

      <RailItem show={!collapsed} className="flex-none">
        <div className="flex-none border-t border-outline-variant px-2 py-1">
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 w-full px-2 min-h-[48px] rounded-lg text-body-medium transition-colors duration-200 hover:bg-state-hover state-layer"
                style={{ color: 'var(--text-secondary)' }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-label-medium font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}>
                    {user.email?.[0].toUpperCase()}
                  </div>
                )}
                <span className="truncate text-left flex-1">{user.email?.split('@')[0]}</span>
                <svg className="w-5 h-5 transition-transform duration-200" style={{ transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showDropdown && (
                <div
                  className="absolute bottom-full left-0 right-0 mb-1 rounded-xl shadow-elevation-2 py-1 z-50 border border-outline-variant"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <button
                    onClick={() => { router.push('/configuracoes'); setShowDropdown(false) }}
                    className="w-full text-left px-4 min-h-[48px] text-body-medium hover:bg-state-hover transition-colors flex items-center gap-3 state-layer"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configurações
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 min-h-[48px] text-body-medium hover:bg-state-hover transition-colors flex items-center gap-3 state-layer"
                    style={{ color: 'var(--error)' }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sair
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </RailItem>

      <CreatePlaylistModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </>
  )

  // `display: none` inline nos dois ramos (coluna e navegação inferior) em vez
  // de `return null`: há hooks/effects depois deste ponto e sair cedo violaria
  // as Rules of Hooks. O `aside` ainda tem ResizeObserver — ao sumir, ele
  // reporta largura 0 e zera `--sidebar-w`, então o modal acompanha sozinho.
  return (
    <>
      <aside
        ref={desktopAsideRef}
        style={{ display: immersive ? 'none' : undefined }}
        className={`hidden md:flex flex-col h-full overflow-hidden bg-[var(--bg-surface)] transition-[width] duration-[var(--motion-duration-standard)] ease-[var(--motion-easing-standard)] flex-shrink-0 ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Navegação inferior existente: uma única barra, sem segunda barra nova (§7). */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around bg-[var(--bg-base)] border-t border-outline-variant z-50 md:hidden safe-area-bottom" style={{ display: immersive ? 'none' : undefined }}>
        {NAV_SECTION1.map(item => {
          const active = isActive(item.href)
          const isLibrary = item.href === '/biblioteca' || item.href === '/biblioteca/local'
          return (
            <button
              key={item.href}
              onClick={() => {
                if (isLibrary) { setDrawerOpen(true); return }
                router.push(item.href)
              }}
              className="flex flex-col items-center justify-center gap-0.5 w-full h-full pt-2"
              aria-current={active ? 'page' : undefined}
            >
              <svg className={`w-5 h-5 ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.outline} />
              </svg>
              <span className={`text-label-medium ${active ? 'font-bold text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]'}`}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Drawer mobile existente: biblioteca integra-se à navegação móvel atual (§7). */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer-scrim"
            className="fixed inset-0 bg-scrim backdrop-blur-sm z-40 md:hidden"
            variants={scrimVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setDrawerOpen(false)}
          />
        )}
        {drawerOpen && (
          <motion.aside
            key="drawer-panel"
            className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-[300px] bg-[var(--bg-surface)] z-50 flex flex-col md:hidden shadow-2xl"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between h-14 px-4 flex-none">
              <Link href="/" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                <span className="gradient-accent-text">Ember</span>
                <span> Music</span>
              </Link>
              <button onClick={() => setDrawerOpen(false)} className="h-12 w-12 inline-flex items-center justify-center rounded-lg hover:bg-state-hover transition-colors duration-200 state-layer" aria-label="Fechar menu">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-primary)' }}>
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-none px-2 space-y-0.5">
              {NAV_SECTION1.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-body-medium transition-all duration-200 state-layer ${
                      active
                        ? 'font-bold bg-state-hover text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <NavIcon icon={{ outline: item.outline, fill: item.fill }} active={active} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <hr className="mx-4 my-2 border-outline-variant flex-none" />

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2 space-y-0.5" role="list" aria-label="Itens da biblioteca">
              {libraryItems.map(item => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 h-[48px] px-2 rounded-lg text-body-medium transition-all duration-200 state-layer ${
                      active
                        ? 'font-bold bg-state-hover text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="w-10 h-10 overflow-hidden flex-shrink-0 bg-surface-container-highest inline-block">
                      {item.imageUrl ? (
                        <CoverImage src={item.imageUrl} alt="" className={`w-full h-full object-cover ${item.type === 'artist' ? 'rounded-full' : 'rounded-md'}`} />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-label-medium font-bold" style={{ color: 'var(--text-primary)' }}>
                          {item.title.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{item.title}</span>
                      <span className="block truncate text-label-medium" style={{ color: 'var(--text-disabled)' }}>
                        {item.type === 'playlist' ? 'Playlist' : 'Artista'}
                      </span>
                    </span>
                  </Link>
                )
              })}
              {!libraryLoading && libraryItems.length === 0 && (
                <div className="truncate px-3 py-6 text-center text-body-medium" style={{ color: 'var(--text-disabled)' }}>
                  Sua biblioteca está vazia
                </div>
              )}
            </div>

            {user && (
              <div className="flex-none border-t border-outline-variant px-2 py-1">
                <div className="relative">
                  <button
                    onClick={() => { router.push('/configuracoes'); setDrawerOpen(false) }}
                    className="flex items-center gap-3 w-full px-2 min-h-[48px] rounded-lg text-body-medium transition-colors duration-200 hover:bg-state-hover state-layer"
                    style={{ color: 'var(--text-secondary)' }}
                  >
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
