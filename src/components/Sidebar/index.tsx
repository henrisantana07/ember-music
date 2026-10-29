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
import { ClassificationMenu } from '@/components/ui/ClassificationMenu'
import { IconButton } from '@/components/ui/IconButton'
import { CoverImage } from '@/components/ui/CoverImage'
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { buildLibraryItems, isLikedItem } from '@/lib/library/types'
import { filterLibraryItems } from '@/lib/library/filterLibraryItems'
import { sortLibraryItems } from '@/lib/library/sortLibraryItems'
import type { LibraryItem, LibraryItemType } from '@/lib/library/types'
import type { Album } from '@/types/music'

const NAV_SECTION1 = [
  { href: '/', label: 'Início', outline: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', fill: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/buscar', label: 'Explorar', outline: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z', fill: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z' },
  { href: '/biblioteca', label: 'Biblioteca', outline: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', fill: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { href: '/biblioteca/local', label: 'Biblioteca Local', outline: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', fill: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
]

// Quantidade máxima de itens exibidos no rail recolhido
const RAIL_LIMIT = 5

const TYPE_FILTERS: { value: LibraryItemType; label: string }[] = [
  { value: 'playlist', label: 'Playlists' },
  { value: 'artist', label: 'Artistas' },
  { value: 'album', label: 'Álbuns' },
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
          className={`min-h-0 min-w-0 flex flex-col ${className}`}
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



/** Tile de capa normalizado: curtidas (coração sobre gradação de acento),
 *  imagem, ou inicial sobre a superfície mais alta. Mesmo padrão na lista,
 *  na grade, no drawer e no rail. */
function ItemCover({ item, size }: { item: LibraryItem; size: 'row' | 'grid' }) {
  const frame = size === 'row' ? 'w-10 h-10' : 'w-full aspect-square'
  if (isLikedItem(item)) {
    return (
      <span
        className={`${frame} flex-shrink-0 inline-flex items-center justify-center rounded-md`}
        style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
        aria-hidden="true"
      >
        <svg className={size === 'row' ? 'w-5 h-5' : 'w-8 h-8'} viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--bg-base)' }}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </span>
    )
  }
  if (item.imageUrl) {
    return (
      <span className={`${frame} flex-shrink-0 overflow-hidden inline-block bg-surface-container-highest ${item.type === 'artist' ? 'rounded-full' : 'rounded-md'}`}>
        <CoverImage src={item.imageUrl} alt="" className="w-full h-full object-cover" />
      </span>
    )
  }
  return (
    <span className={`${frame} flex-shrink-0 inline-flex items-center justify-center bg-surface-container-highest ${item.type === 'artist' ? 'rounded-full' : 'rounded-md'}`}>
      <span className="text-label-medium font-bold" style={{ color: 'var(--text-primary)' }}>
        {item.title.charAt(0).toUpperCase()}
      </span>
    </span>
  )
}

function NavIcon({ icon, active }: { icon: { outline: string; fill: string }; active: boolean }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={icon.outline} />
    </svg>
  )
}

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

  /* Fontes reais complementares:
     - curtidas: contagem na mesma tabela `favorites` que a aba favoritos de /biblioteca;
     - álbuns: /api/youtube (searchYouTubePlaylists, cache no servidor). */
  const [youtubeAlbums, setYoutubeAlbums] = useState<Album[]>([])
  const [likedCount, setLikedCount] = useState(0)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [expandedWidth, setExpandedWidth] = useState<number>(() => {
    let w = 320
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('ember:sidebar-width')
        const parsed = raw ? parseInt(raw, 10) : NaN
        if (!Number.isNaN(parsed) && parsed >= 240 && parsed <= 460) w = parsed
      } catch { /* ignore */ }
    }
    return w
  })
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false)

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
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem('ember:sidebar-width', String(expandedWidth)) } catch { /* ignore */ }
  }, [expandedWidth])

  /* Curtidas + álbuns, como as fontes "antigas": a contagem vem da tabela
     `favorites` e os álbuns da API do YouTube via /api/youtube. Em falha ou
     sem chave configurada, o painel se degrada sem a seção de álbuns (a
     resposta 503/429 é tratada como ausência — nada de conteúdo falso).
     Sem usuário, não há escrita de estado aqui: playlists/artistas do
     zustand se comportam igual (nada é limpo no logout até o próximo login). */
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const controller = new AbortController()
    let cancelled = false
    ;(async () => {
      const { count } = await supabase
        .from('favorites')
        .select('track_id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if (!cancelled && typeof count === 'number') setLikedCount(count)
      try {
        const res = await fetch('/api/youtube?endpoint=albums&limit=12', { signal: controller.signal })
        const data: unknown = await res.json()
        const results = (data as { results?: unknown })?.results
        if (!cancelled && Array.isArray(results)) setYoutubeAlbums(results as Album[])
        else if (!cancelled) setYoutubeAlbums([])
      } catch (err) {
        if (!cancelled && (err as Error)?.name !== 'AbortError') setYoutubeAlbums([])
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
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

  useEffect(() => {
    if (!isDraggingSidebar) return
    function onMove(e: MouseEvent) {
      if (e.clientX <= 120) return
      const next = Math.max(240, Math.min(460, e.clientX))
      setExpandedWidth(next)
    }
    function onUp() {
      setIsDraggingSidebar(false)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDraggingSidebar])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    setShowDropdown(false)
  }

useEffect(() => {
    if (user) {
      fetchPlaylists()
      fetchArtists()
    }
  }, [user, fetchPlaylists, fetchArtists])
  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  /* Coleção normalizada das fontes reais → busca + filtro de tipo + ordenação
     (§5.1/§5.2, funções puras em lib/library). */
  const libraryItems = useMemo(
    () => buildLibraryItems(playlists, artists, youtubeAlbums, likedCount),
    [playlists, artists, youtubeAlbums, likedCount],
  )

  const visibleItems = useMemo(() => {
    /* Curtidas são um atalho fixo: ficam sempre no topo, fora do filtro de
       tipo e da busca — chips e consulta restringem apenas as coleções de
       playlists/artistas/álbuns abaixo delas. */
    const fixed = libraryItems.filter((i) => i.type === 'liked')
    const candidates = filterLibraryItems(
      libraryItems.filter((i) => i.type !== 'liked'),
      query,
      typeFilter,
    )
    return sortLibraryItems([...fixed, ...candidates], prefs.sort)
  }, [libraryItems, query, typeFilter, prefs.sort])

  const libraryLoading = !userLoading && (playlistsLoading || artistsLoading)

  /* Estados de vazio distintos (§8): sem resultados da busca versus coleção vazia. */
  const noResults = !libraryLoading && visibleItems.length === 0 && (query !== '' || typeFilter !== null)
  const emptyLibrary = !libraryLoading && libraryItems.length === 0

  function renderLibraryRow(item: (typeof libraryItems)[number], compact: boolean) {
    const active = pathname === item.href
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
        {!compact && <ItemCover item={item} size="row" />}
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
      {/* Navegação da biblioteca: as mesmas fontes de dados em modo rail recolhido. */}
      <RailItem show={collapsed} className="flex-1">
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-6 space-y-0.5 flex flex-col items-center justify-end">
          {visibleItems.slice(0, RAIL_LIMIT).map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-center min-h-[48px] w-full rounded-lg transition-all duration-200 state-layer ${
                  active
                    ? 'font-bold bg-state-hover text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'
                }`}
                title={item.title}
              >
                <span className="w-8 h-8 flex-shrink-0 inline-flex items-center justify-center">
                  {item.type === 'liked' ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--accent-solid)' }}>
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  ) : item.imageUrl ? (
                    <CoverImage src={item.imageUrl} alt="" className={`w-6 h-6 object-cover ${item.type === 'artist' ? 'rounded-full' : 'rounded-md'}`} />
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

          <div className="flex gap-1 pl-3 pr-3 py-1 min-w-0 overflow-x-auto mb-2">
            {TYPE_FILTERS.map(filter => (
              <FilterChip
                key={filter.value}
                selected={typeFilter === filter.value}
                onClick={() => setTypeFilter(typeFilter === filter.value ? null : filter.value)}
                className="h-7 flex-shrink-0"
              >
                {filter.label}
              </FilterChip>
            ))}
          </div>

          <div className="flex-none flex items-center justify-between gap-2 min-w-0 pl-3 pr-1">
            <div
              className="flex items-center gap-2 rounded-full px-3 h-8 max-w-[210px] flex-1 min-w-0"
              style={{ backgroundColor: '#121212', border: '1px solid var(--outline-variant)' }}
            >
              <svg className="w-4 h-4 flex-shrink-0 pointer-events-none" style={{ color: 'var(--text-disabled)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={query}
                placeholder="Buscar na biblioteca"
                aria-label="Buscar músicas, álbuns ou artistas"
                className="flex-1 min-w-0 h-7 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:ring-0 max-w-[140px]"
              />
            </div>
            <ClassificationMenu sort={prefs.sort} view={prefs.view} onSortChange={(s) => updatePrefs({ sort: s })} onViewChange={(v) => updatePrefs({ view: v })} />
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
                    <ItemCover item={item} size="grid" />
                    <span className="block truncate text-body-medium">{item.title}</span>
                    <span className="block truncate text-label-medium" style={{ color: 'var(--text-disabled)' }}>
                      {item.type === 'playlist' ? 'Playlist' : item.type === 'album' ? 'Álbum' : item.type === 'artist' ? 'Artista' : 'Curtidas'}
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
        style={{ display: immersive ? 'none' : undefined, width: collapsed ? undefined : `${expandedWidth}px` }}
        className={`hidden md:flex flex-col h-full overflow-hidden bg-[var(--bg-surface)] flex-shrink-0 relative ${
          collapsed ? 'w-[72px]' : (isDraggingSidebar ? '' : 'transition-[width] duration-[var(--motion-duration-standard)] ease-[var(--motion-easing-standard)]')
        }`}
      >
        {sidebarContent}
        {!collapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar a barra lateral"
            onMouseDown={() => setIsDraggingSidebar(true)}
            className="absolute top-0 bottom-0 right-0 w-1.5 cursor-col-resize z-20 bg-transparent hover:bg-[var(--accent-solid)]/30 group"
            title="Arraste para redimensionar"
          />
        )}
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

            <div className="flex gap-1 px-2 py-1 min-w-0 overflow-x-auto flex-none">
              {TYPE_FILTERS.map(filter => (
                <FilterChip
                  key={filter.value}
                  selected={typeFilter === filter.value}
                  onClick={() => setTypeFilter(typeFilter === filter.value ? null : filter.value)}
                  className="h-7 flex-shrink-0"
                >
                  {filter.label}
                </FilterChip>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2 space-y-0.5" role="list" aria-label="Itens da biblioteca">
              {visibleItems.map(item => {
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
                    <ItemCover item={item} size="row" />
                    <span className="min-w-0">
                      <span className="block truncate">{item.title}</span>
                      <span className="block truncate text-label-medium" style={{ color: 'var(--text-disabled)' }}>
                        {item.type === 'playlist' ? 'Playlist' : item.type === 'album' ? 'Álbum' : item.type === 'artist' ? 'Artista' : 'Curtidas'}
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
