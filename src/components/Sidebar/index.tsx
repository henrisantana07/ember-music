'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useMemo, useState, useRef, useSyncExternalStore } from 'react'
import type { ReactNode, MouseEvent as ReactMouseEvent } from 'react'
import { usePlaylistsStore } from '@/lib/playlists-store'
import { useArtistsStore } from '@/lib/artists-store'
import { useSidebarStore } from '@/lib/sidebar-store'
import { usePlayerStore } from '@/lib/store'
import { useUser } from '@/hooks/use-user'
import { useAvatar } from '@/hooks/use-avatar'
import { useLibraryPreferences } from '@/hooks/use-library-preferences'
import { usePinnedPlaylists } from '@/hooks/use-pinned-playlists'
import { AnimatePresence, motion } from 'motion/react'
import { scrimVariants, drawerVariants, TRANSITION } from '@/lib/motion'
import { FilterChip } from '@/components/ui/FilterChip'
import { ClassificationMenu } from '@/components/ui/ClassificationMenu'
import { IconButton } from '@/components/ui/IconButton'
import { CoverImage } from '@/components/ui/CoverImage'
import { CustomScroll } from '@/components/CustomScroll'
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal'
import { SaveAlbumButton } from '@/components/SaveAlbumButton'
import { EmptyState } from '@/components/ui/states'
import { LibraryRailSkeleton } from '@/components/Skeleton'
import { buildLibraryItems, isLikedItem, pinLikedFirst, type FavoriteLibraryItem } from '@/lib/library/types'
import { filterLibraryItems } from '@/lib/library/filterLibraryItems'
import { sortLibraryItems } from '@/lib/library/sortLibraryItems'
import { orderPinnedFirst } from '@/lib/library/pinLibraryItems'
import type { LibraryItem, LibraryItemType } from '@/lib/library/types'
import type { Album, Track } from '@/types/music'

const NAV_SECTION1 = [
  { href: '/', label: 'Início', outline: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/buscar', label: 'Explorar', outline: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z' },
  { href: '/biblioteca', label: 'Biblioteca', outline: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { href: '/biblioteca/local', label: 'Biblioteca Local', outline: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
]

/* A barra inferior tem três destinos, não quatro: "Biblioteca Local" fica
   disponível no drawer, onde há espaço para o rótulo inteiro. Dois botões que
   abriam o mesmo drawer só duplicavam o alvo e pintavam `active` juntos. */
const MOBILE_NAV_ITEMS = NAV_SECTION1.filter((item) => item.href !== '/biblioteca/local')

// Quantidade máxima de itens exibidos no rail recolhido
const RAIL_LIMIT = 5

const TYPE_FILTERS: { value: LibraryItemType; label: string }[] = [
  { value: 'playlist', label: 'Playlists' },
  { value: 'artist', label: 'Artistas' },
  { value: 'favorite', label: 'Favoritos' },
]

/* Largura da sidebar como store externo, igual às outras preferências locais.
   O snapshot do servidor é sempre 320: ler localStorage durante o primer
   render fazia a aside sair com largura diferente no HTML e no cliente, que é
   exatamente o hydration mismatch #418 (args[]=HTML) visto em produção. */
const WIDTH_KEY = 'ember:sidebar-width'
const DEFAULT_WIDTH = 320
const widthListeners = new Set<() => void>()

function getWidthSnapshot(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH
  try {
    const raw = window.localStorage.getItem(WIDTH_KEY)
    const parsed = raw ? parseInt(raw, 10) : NaN
    if (!Number.isNaN(parsed) && parsed >= 320 && parsed <= 460) return parsed
  } catch { /* storage indisponível */ }
  return DEFAULT_WIDTH
}

function getServerWidthSnapshot(): number {
  return DEFAULT_WIDTH
}

function subscribeWidth(listener: () => void) {
  widthListeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    widthListeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function writeWidth(width: number) {
  try { window.localStorage.setItem(WIDTH_KEY, String(width)) } catch { /* ignore */ }
  widthListeners.forEach((listener) => listener())
}

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
function ItemCover({
  item,
  size,
  onPlay,
}: {
  item: LibraryItem
  size: 'row' | 'grid'
  onPlay?: (e: ReactMouseEvent) => void
}) {
  const frame = size === 'row' ? 'w-14 h-14' : 'w-full aspect-square'
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

  const shape = item.type === 'artist' ? 'rounded-full' : 'rounded-md'
  const visual = item.imageUrl
    ? <CoverImage src={item.imageUrl} alt="" className="w-full h-full object-cover" />
    : (
        <span className="text-label-medium font-bold" style={{ color: 'var(--text-primary)' }}>
          {item.title.charAt(0).toUpperCase()}
        </span>
      )

  /* Favoritos são faixas reais: a capa vira botão de play e o evento é
     interrompido para o Link ao redor não navegar. Demais tipos seguem
     apenas capa decorativa. */
  if (item.track && onPlay) {
    return (
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Reproduzir ${item.title}`}
        title={`Reproduzir ${item.title}`}
        className={`${frame} flex-shrink-0 overflow-hidden inline-flex items-center justify-center bg-surface-container-highest ${shape} cursor-pointer`}
      >
        {visual}
      </button>
    )
  }

  return (
    <span className={`${frame} flex-shrink-0 overflow-hidden inline-flex items-center justify-center bg-surface-container-highest ${shape}`}>
      {visual}
    </span>
  )
}

/** Reconstrói o `Album` mínimo que o `SaveAlbumButton` consome a partir do
 *  item normalizado da biblioteca — evita `as any` e mantém o tipo real. */
function libraryItemToAlbum(item: LibraryItem): Album {
  return {
    id: item.id,
    name: item.title,
    artist_id: '',
    artist_name: item.creator || item.subtitle || '',
    image: item.imageUrl || '',
    release_date: item.createdAt || '',
    total_tracks: 0,
    url: '',
  }
}

/** Marcador discreto do item fixado ("Músicas curtidas"). */
function PinnedBadge() {
  return (
    <span className="inline-flex flex-shrink-0 items-center" title="Fixado">
      <svg
        className="w-3 h-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        style={{ color: 'var(--text-disabled)' }}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v5" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
        />
      </svg>
      <span className="sr-only">Fixado</span>
    </span>
  )
}

function NavIcon({ icon, active }: { icon: { outline: string }; active: boolean }) {
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
  /* Com a hero aberta, o rodapé do player ocupa o lugar da bottom nav. */
  const playerExpanded = usePlayerStore((s) => s.isExpandedOpen)
  const play = usePlayerStore((s) => s.play)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const desktopAsideRef = useRef<HTMLElement>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const { playlists, loading: playlistsLoading, fetchPlaylists, reset: resetPlaylists } = usePlaylistsStore()
  const { artists, loading: artistsLoading, fetchArtists } = useArtistsStore()
  const { user, loading: userLoading } = useUser()
  const avatarUrl = useAvatar(user?.id)
  const { prefs, update: updatePrefs } = useLibraryPreferences()
  const { ids: pinnedIds, isPinned } = usePinnedPlaylists()

  // Filtro de tipo: seleção única, removível — clicar no chip ativo limpa (§5.1).
  const [typeFilter, setTypeFilter] = useState<LibraryItemType | null>(null)
  const [query, setQuery] = useState('')

  /* Favoritos reais da tabela `favorites` — a sidebar mostra as faixas, não
     só a contagem do atalho "Músicas curtidas". */
  const [favoriteTracks, setFavoriteTracks] = useState<FavoriteLibraryItem[]>([])
  const [likedCount, setLikedCount] = useState(0)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const expandedWidth = useSyncExternalStore(
    subscribeWidth,
    getWidthSnapshot,
    getServerWidthSnapshot
  )
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

  /* Favoritos: mesma tabela usada pela aba "favoritos" de /biblioteca.
     Em falha, o painel degrada para lista vazia — nada de conteúdo falso. */
  useEffect(() => {
    if (!user) {
      setFavoriteTracks([])
      setLikedCount(0)
      return
    }
    const supabase = createClient()
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('track_data, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        setFavoriteTracks([])
        setLikedCount(0)
        return
      }
      const items: FavoriteLibraryItem[] = (data ?? [])
        .map((row) => ({
          track: row.track_data as unknown as Track,
          createdAt: row.created_at ?? null,
        }))
        .filter((item) => !!item.track?.id && !!item.track?.name)
      setFavoriteTracks(items)
      setLikedCount(items.length)
    })()
    return () => { cancelled = true }
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

  /* O drawer é um modal: Escape fecha, a navegação de fundo para de rolar e
     trocar de rota sempre o dispensa (inclusive os links de dentro dele). */
  useEffect(() => {
    if (!drawerOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    const scrollers = Array.from(document.querySelectorAll<HTMLElement>('.main-container'))
    const previousOverflow = scrollers.map((el) => el.style.overflowY)
    scrollers.forEach((el) => { el.style.overflowY = 'hidden' })
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      scrollers.forEach((el, i) => { el.style.overflowY = previousOverflow[i] })
    }
  }, [drawerOpen])

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isDraggingSidebar) return
    function onMove(e: MouseEvent) {
      if (e.clientX <= 120) return
      const next = Math.max(320, Math.min(460, e.clientX))
      writeWidth(next)
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
    if (!user) return
    /* Só limpa o cache quando a conta muda de fato. */
    resetPlaylists()
    fetchPlaylists()
    fetchArtists()
  }, [user?.id, resetPlaylists, fetchPlaylists, fetchArtists])
  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    /* `/biblioteca` e `/biblioteca/local` são destinos distintos: o
       `startsWith` antigo pintava os dois como ativos na rota local. */
    if (href === '/biblioteca') return pathname === '/biblioteca'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  /* Coleção normalizada das fontes reais → busca + filtro de tipo + ordenação
     (§5.1/§5.2, funções puras em lib/library). */
  const libraryItems = useMemo(
    () => buildLibraryItems(playlists, artists, [], likedCount, user?.email ?? '', favoriteTracks),
    [playlists, artists, likedCount, user?.email, favoriteTracks],
  )

  const visibleItems = useMemo(() => {
    /* Curtidas são um atalho fixo: ficam sempre no topo, fora do filtro de
       tipo e da busca — chips e consulta restringem apenas as coleções de
       playlists/artistas/álbuns abaixo delas. `pinLikedFirst` garante que a
       ordenação escolhida nunca mova o item fixado da primeira posição. */
    const fixed = libraryItems.filter((i) => i.type === 'liked')
    const candidates = filterLibraryItems(
      libraryItems.filter((i) => i.type !== 'liked'),
      query,
      typeFilter,
    )
    const cleanCandidates = candidates.filter((i) => !(i.type === 'album' && !i.creator))
    /* Fixadas manualmente vêm logo depois das curtidas, na ordem de fixação
       (prioridade/chegada). `pinLikedFirst` mantém "Músicas curtidas" no topo. */
    return pinLikedFirst(
      orderPinnedFirst(sortLibraryItems([...fixed, ...cleanCandidates], prefs.sort), pinnedIds),
    )
  }, [libraryItems, query, typeFilter, prefs.sort, pinnedIds])

  const libraryLoading = !userLoading && (playlistsLoading || artistsLoading)

  /* Estados de vazio distintos (§8): sem resultados da busca versus coleção vazia. */
  const noResults = !libraryLoading && visibleItems.length === 0 && (query !== '' || typeFilter !== null)
  const emptyLibrary = !libraryLoading && libraryItems.length === 0

  /* A capa dos favoritos toca a faixa no lugar: o clique na capa não deve
     navegar para /biblioteca, ao contrário do clique no nome. */
  function playFavorite(e: ReactMouseEvent, item: LibraryItem) {
    e.preventDefault()
    e.stopPropagation()
    if (!item.track) return
    play(item.track, favoriteTracks.map((f) => f.track), 'favorites', 'Favoritos')
  }

  function renderLibraryRow(item: (typeof libraryItems)[number], compact: boolean) {
    const active = pathname === item.href
    return (
      <Link
        key={item.id}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center ${compact ? 'gap-2 h-8 px-3' : 'gap-3 h-[64px] px-3'} rounded-lg text-body-medium transition-all duration-200 state-layer ${
          active
            ? 'font-bold bg-state-hover text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'
        }`}
      >
        {!compact && <ItemCover item={item} size="row" onPlay={(e) => playFavorite(e, item)} />}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="truncate">{item.title}</span>
            {(item.type === 'liked' || isPinned(item.id)) && <PinnedBadge />}
          </span>
          {!compact && item.subtitle && (
            <span className="block truncate text-label-medium" style={{ color: 'var(--text-disabled)' }}>
              {item.subtitle}
            </span>
          )}
        </span>
        {!compact && item.type === 'album' && (
          <span className="flex-shrink-0">
            <SaveAlbumButton album={libraryItemToAlbum(item)} />
          </span>
        )}
      </Link>
    )
  }

  const sidebarContent = (
    <>
      {/* Navegação da biblioteca: as mesmas fontes de dados em modo rail recolhido. */}
      <RailItem show={collapsed} className="flex-1">
        <CustomScroll className="px-2 py-8 flex flex-col items-center justify-start space-y-3" wrapperClassName="flex-1 min-h-0" role="list" ariaLabel="Itens da biblioteca minimizada">
          {visibleItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-center min-h-[64px] w-full rounded-lg transition-all duration-200 state-layer ${
                  active
                    ? 'font-bold bg-state-hover text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'
                }`}
                title={item.title}
              >
                <span className="relative w-14 h-14 flex-shrink-0 inline-flex items-center justify-center">
                  {item.type === 'liked' ? (
                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--accent-solid)" }}>
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  ) : item.imageUrl && item.track ? (
                    <button
                      type="button"
                      onClick={(e) => playFavorite(e, item)}
                      aria-label={`Reproduzir ${item.title}`}
                      title={`Reproduzir ${item.title}`}
                      className={`w-14 h-14 overflow-hidden cursor-pointer ${item.type === 'artist' ? 'rounded-full' : 'rounded-md'}`}
                    >
                      <CoverImage src={item.imageUrl} alt="" className="w-14 h-14 object-cover" />
                    </button>
                  ) : item.imageUrl ? (
                    <CoverImage src={item.imageUrl} alt="" className={`w-14 h-14 object-cover ${item.type === "artist" ? "rounded-full" : "rounded-md"}`} />
                  ) : (
                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  )}
                  {(item.type === 'liked' || isPinned(item.id)) && (
                    <span className="absolute top-0 right-0">
                      <PinnedBadge />
                    </span>
                  )}
                </span>
              </Link>
            )
          })}
        </CustomScroll>
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
              className="flex items-center gap-2 rounded-full px-3 h-8 max-w-[210px] flex-1 min-w-0 outline-none border border-[var(--outline-variant)] focus-within:border-[var(--accent-from)] transition-colors"
              style={{ backgroundColor: '#2c2620' }}
            >
              <svg className="w-4 h-4 flex-shrink-0 pointer-events-none" style={{ color: 'var(--text-disabled)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar na biblioteca"
                aria-label="Buscar músicas, álbuns ou artistas"
                className="flex-1 min-w-0 h-7 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:ring-0 focus-visible:outline-none max-w-[140px]"
                style={{ outline: 'none' }}
              />
            </div>
            <ClassificationMenu sort={prefs.sort} view={prefs.view} onSortChange={(s) => updatePrefs({ sort: s })} onViewChange={(v) => updatePrefs({ view: v })} />
          </div>

          <CustomScroll className="px-2 pb-2 space-y-0.5" wrapperClassName="flex-1 min-h-0" role="list" ariaLabel="Itens da biblioteca">
            {libraryLoading && <LibraryRailSkeleton />}
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
            {!libraryLoading && !noResults && !emptyLibrary && (
              prefs.view === 'grid' ? (
                <div className="grid grid-cols-3 gap-3">
                  {visibleItems.map(item => {
                    const active = pathname === item.href
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`relative flex flex-col gap-2 p-3 rounded-lg transition-all duration-200 state-layer ${
                          active
                            ? 'bg-state-hover text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <ItemCover item={item} size="grid" onPlay={(e) => playFavorite(e, item)} />
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate text-body-medium">{item.title}</span>
                          {(item.type === 'liked' || isPinned(item.id)) && <PinnedBadge />}
                        </span>
                        <span className="block truncate text-label-medium" style={{ color: 'var(--text-disabled)' }}>
                          {item.type === 'playlist' ? 'Playlist' : item.type === 'album' ? 'Álbum' : item.type === 'artist' ? 'Artista' : 'Curtidas'}
                        </span>
                        {item.type === 'album' && (
                          <div className="absolute bottom-2 right-2">
                            <SaveAlbumButton album={libraryItemToAlbum(item)} />
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              ) : (
                visibleItems.map(item => renderLibraryRow(item, prefs.view === 'compact'))
              )
            )}
          </CustomScroll>
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

      {/* Navegação inferior existente: uma única barra, sem segunda barra nova (§7).
          A altura inclui o safe area, então o ícone nunca fica sob o home
          indicator; o rodapé do player usa `--chrome-bottom` para assentar
          exatamente em cima desta barra em vez de pintar por cima dela. */}
      <nav
        aria-label="Navegação principal"
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around border-t border-outline-variant bg-[var(--bg-base)] md:hidden"
        style={{
          display: immersive || playerExpanded ? 'none' : undefined,
          height: 'var(--chrome-bottom)',
          paddingBottom: 'var(--safe-bottom)',
        }}
      >
        {MOBILE_NAV_ITEMS.map(item => {
          const active = isActive(item.href)
          return (
            <button
              key={item.href}
              onClick={() => {
                if (item.href === '/biblioteca') { setDrawerOpen(true); return }
                router.push(item.href)
              }}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1"
              aria-current={active ? 'page' : undefined}
              aria-label={item.label === 'Biblioteca' ? 'Abrir biblioteca' : item.label}
            >
              <svg className={`h-6 w-6 flex-shrink-0 ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.outline} />
              </svg>
              <span className={`text-label-medium w-full truncate text-center leading-none ${active ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Drawer mobile existente: biblioteca integra-se à navegação móvel atual (§7). */}
      <AnimatePresence>
        {drawerOpen && (
          /* Sem blur no scrim que faz fade: o `backdrop-filter` era
             recalculado a cada frame dos 160ms de entrada/saída. */
          <motion.div
            key="drawer-scrim"
            className="fixed inset-0 z-[80] bg-scrim md:hidden"
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
            role="dialog"
            aria-modal="true"
            aria-label="Biblioteca"
            style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
            className="fixed left-0 top-0 bottom-0 z-[90] flex w-[85vw] max-w-[300px] flex-col bg-[var(--bg-surface)] shadow-2xl md:hidden"
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
                    <NavIcon icon={{ outline: item.outline }} active={active} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <hr className="mx-4 my-2 border-outline-variant flex-none" />

            <div className="hide-scrollbar flex flex-none gap-1 overflow-x-auto px-2 py-1 min-w-0">
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

            <CustomScroll className="px-2 space-y-0.5" wrapperClassName="flex-1 min-h-0" role="list" ariaLabel="Itens da biblioteca">
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
                    <ItemCover item={item} size="row" onPlay={(e) => playFavorite(e, item)} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{item.title}</span>
                        {(item.type === 'liked' || isPinned(item.id)) && <PinnedBadge />}
                      </span>
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
            </CustomScroll>
              {user && (
              <div className="flex-none border-t border-outline-variant px-2 py-1">
                <div className="relative">
                  <button
                    onClick={() => { router.push('/configuracoes'); setDrawerOpen(false) }}
                    aria-label="Abrir configurações da conta"
                    className="flex w-full items-center gap-3 px-2 min-h-[48px] rounded-lg text-body-medium transition-colors duration-200 hover:bg-state-hover state-layer" style={{ color: 'var(--text-secondary)' }}>

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
