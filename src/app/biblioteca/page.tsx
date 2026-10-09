'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrackTable } from '@/components/TrackTable'
import { PlaylistCover } from '@/components/playlist/PlaylistCover'
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import { usePlaylistsStore } from '@/lib/playlists-store'
import { usePlayerStore } from '@/lib/store'
import { FollowButton } from '@/components/FollowButton'
import { ErrorState } from '@/components/ui/states'
import { useUser } from '@/hooks/use-user'
import type { Track } from '@/types/music'
import type { Json } from '@/types/database'
import { Suspense } from 'react'

type TabId = 'favoritos' | 'artistas' | 'playlists' | 'recentes' | 'baixadas'

interface FollowedArtist {
  artist_id: string
  artist_data: { id: string; name: string; image: string } | null
  followed_at: string
}

interface HistoryItem {
  id: string
  track_id: string
  track_data: Track
  played_at: string
}

interface PlaylistTabItem {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  cover_source: string
  custom_cover_url: string | null
  last_track_cover_url: string | null
  created_at: string | null
  updated_at: string | null
  track_count: number
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'favoritos', label: 'Favoritos' },
  { id: 'artistas', label: 'Artistas' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'recentes', label: 'Recentes' },
  { id: 'baixadas', label: 'Baixadas' },
]

const PAGE_SIZE = 24

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days}d`
  return new Date(dateStr).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })
}

function SkeletonCard() {
  return (
    <div className="p-3 rounded-md" style={{ backgroundColor: 'var(--bg-elevated)' }}>
      <div className="w-full aspect-square rounded-md mb-3" style={{ background: 'var(--bg-surface)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
      <div className="h-4 w-3/4 rounded mb-1" style={{ background: 'var(--bg-surface)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
      <div className="h-3 w-1/2 rounded" style={{ background: 'var(--bg-surface)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
    </div>
  )
}

function BibliotecaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const { user, loading: userLoading } = useUser()
  const activeTab = (searchParams.get('tab') as TabId) || 'favoritos'

  const [artistSort, setArtistSort] = useState<'recent' | 'a-z'>('recent')
  const [playlistSort, setPlaylistSort] = useState<'recent' | 'updated' | 'a-z' | 'tracks'>('recent')
  const [trackSort, setTrackSort] = useState<'recent' | 'oldest' | 'a-z' | 'z-a' | 'artist' | 'duration'>('recent')

  const [tracks, setTracks] = useState<Track[]>([])
  const [artists, setArtists] = useState<FollowedArtist[]>([])
  const [playlists, setPlaylists] = useState<PlaylistTabItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [downloads, setDownloads] = useState<Track[]>([])
  const [confirmClear, setConfirmClear] = useState(false)

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [trackOffset, setTrackOffset] = useState(0)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const { play } = usePlayerStore()

  async function handlePlayPlaylist(pl: PlaylistTabItem) {
    const { data: pts } = await supabase
      .from('playlist_tracks')
      .select('track_data')
      .eq('playlist_id', pl.id)
      .order('position', { ascending: true })

    const tracks = (pts ?? []).map((p) => p.track_data as unknown as Track).filter(Boolean)
    if (tracks.length === 0) return

    play(tracks[0], tracks, pl.id, pl.name)
    router.push('/reproducao')
  }

  useEffect(() => {
    if (!userLoading && !user) router.push('/login')
  }, [user, userLoading])

  const fetchTracks = useCallback(async (append = false) => {
    if (!user) return
    const offset = append ? trackOffset : 0
    setLoading(!append)
    if (append) setLoadingMore(true)

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('track_data, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) throw error
      if (data) {
        const parsed = data.map((f) => f.track_data as unknown as Track).filter(Boolean)
        if (append) {
          setTracks((prev) => [...prev, ...parsed])
        } else {
          setTracks(parsed)
        }
        setHasMore(parsed.length === PAGE_SIZE)
        if (append) setTrackOffset((prev) => prev + PAGE_SIZE)
      }
      setLoadError(false)
    } catch {
      if (!append) setLoadError(true)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user, trackOffset])

  const fetchArtists = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('followed_artists')
        .select('*')
        .eq('user_id', user.id)
        .order('followed_at', { ascending: false })
      if (error) throw error
      if (data) setArtists(data as unknown as FollowedArtist[])
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchHistory = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('listening_history')
        .select('*')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(50)
      if (error) throw error
      if (data) setHistory(data as unknown as HistoryItem[])
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchDownloads = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('downloads')
        .select('track_data')
        .eq('user_id', user.id)
        .order('downloaded_at', { ascending: false })
      if (error) throw error
      if (data) {
        const parsed = data.map((d: any) => d.track_data as unknown as Track).filter(Boolean)
        setDownloads(parsed)
      }
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [user])

  const storePlaylists = usePlaylistsStore((s) => s.playlists)

  useEffect(() => {
    if (storePlaylists.length > 0) {
      setPlaylists(storePlaylists.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        cover_url: p.cover_url,
        cover_source: p.cover_source as string,
        custom_cover_url: p.custom_cover_url,
        last_track_cover_url: p.last_track_cover_url,
        created_at: p.created_at,
        updated_at: p.updated_at,
        track_count: p.track_count,
      })))
    }
  }, [storePlaylists])

  useEffect(() => {
    if (!user) return
    setTrackOffset(0)
    setTracks([])
    setArtists([])
    setPlaylists([])
    setHistory([])
    setDownloads([])

    switch (activeTab) {
      case 'favoritos':
        fetchTracks()
        break
      case 'artistas':
        fetchArtists()
        break
      case 'playlists':
        usePlaylistsStore.getState().fetchPlaylists()
        break
      case 'recentes':
        fetchHistory()
        break
      case 'baixadas':
        fetchDownloads()
        break
    }
  }, [user, activeTab, loadAttempt])

  const loadMoreTracks = useCallback(() => {
    if (activeTab === 'favoritos') fetchTracks(true)
  }, [activeTab, fetchTracks])

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMoreTracks,
    hasMore: activeTab === 'favoritos' && hasMore,
    loading: loadingMore,
  })

  function setTab(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'favoritos') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    const qs = params.toString()
    router.push(qs ? `/biblioteca?${qs}` : '/biblioteca')
  }

  function getSortedTracks(list: Track[] = tracks): Track[] {
    const sorted = [...list]
    switch (trackSort) {
      case 'recent': return sorted
      case 'oldest': return sorted.reverse()
      case 'a-z': return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'z-a': return sorted.sort((a, b) => b.name.localeCompare(a.name))
      case 'artist': return sorted.sort((a, b) => a.artist_name.localeCompare(b.artist_name))
      case 'duration': return sorted.sort((a, b) => a.duration - b.duration)
      default: return sorted
    }
  }

  function getSortedArtists(): FollowedArtist[] {
    const list = [...artists]
    switch (artistSort) {
      case 'a-z': return list.sort((a, b) => (a.artist_data?.name ?? '').localeCompare(b.artist_data?.name ?? ''))
      case 'recent':
      default: return list
    }
  }

  function getSortedPlaylists(): PlaylistTabItem[] {
    const list = [...playlists]
    switch (playlistSort) {
      case 'recent': return list
      case 'updated': return list.sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime())
      case 'a-z': return list.sort((a, b) => a.name.localeCompare(b.name))
      case 'tracks': return list.sort((a, b) => b.track_count - a.track_count)
      default: return list
    }
  }

  function handlePlayTrack(track: Track, list: Track[]) {
    play(track, list)
  }

  async function handleClearHistory() {
    if (!user) return
    await supabase.from('listening_history').delete().eq('user_id', user.id)
    setHistory([])
  }

  function renderSortDropdown() {
    switch (activeTab) {
      case 'favoritos':
      case 'recentes':
      case 'baixadas':
        return (
          <select
            value={trackSort}
            onChange={(e) => setTrackSort(e.target.value as typeof trackSort)}
            className="sort-select text-label-large rounded-full px-4 min-h-[48px] outline-none cursor-pointer state-layer"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--outline-variant)' }}
          >
            <option value="recent">Adicionado recentemente</option>
            <option value="oldest">Mais antigo primeiro</option>
            <option value="a-z">A → Z</option>
            <option value="z-a">Z → A</option>
            <option value="artist">Artista (A → Z)</option>
            <option value="duration">Duração</option>
          </select>
        )
      case 'artistas':
        return (
          <select
            value={artistSort}
            onChange={(e) => setArtistSort(e.target.value as typeof artistSort)}
            className="sort-select text-label-large rounded-full px-4 min-h-[48px] outline-none cursor-pointer state-layer"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--outline-variant)' }}
          >
            <option value="recent">Seguido recentemente</option>
            <option value="a-z">A → Z</option>
          </select>
        )
      case 'playlists':
        return (
          <select
            value={playlistSort}
            onChange={(e) => setPlaylistSort(e.target.value as typeof playlistSort)}
            className="sort-select text-label-large rounded-full px-4 min-h-[48px] outline-none cursor-pointer state-layer"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--outline-variant)' }}
          >
            <option value="recent">Criada recentemente</option>
            <option value="updated">Modificada recentemente</option>
            <option value="a-z">A → Z</option>
            <option value="tracks">Nº de faixas</option>
          </select>
        )
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Biblioteca</h1>
        {activeTab === 'playlists' && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary text-label-large flex items-center gap-2 min-h-[48px] px-5"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" />
            </svg>
            Nova Playlist
          </button>
        )}
        {activeTab === 'recentes' && history.length > 0 && (
          confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-body-medium" style={{ color: 'var(--text-secondary)' }}>Limpar histórico?</span>
              <button
                onClick={() => { handleClearHistory(); setConfirmClear(false) }}
                className="text-label-large px-4 min-h-[48px] rounded-full font-bold state-layer"
                style={{ background: 'var(--error)', color: 'white' }}
              >
                Sim
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-label-large px-4 min-h-[48px] rounded-full state-layer"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--outline-variant)' }}
              >
                Não
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-label-large px-4 min-h-[48px] rounded-full transition-colors state-layer"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--outline-variant)' }}
            >
              Limpar histórico
            </button>
          )
        )}
      </div>

      <div role="tablist" aria-label="Seções da biblioteca" className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(tab.id)}
              className="tab-pill text-label-large font-medium px-5 min-h-[48px] rounded-full transition-all duration-150 whitespace-nowrap state-layer"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, var(--accent-from), var(--accent-to))'
                  : 'var(--bg-surface)',
                color: isActive ? 'var(--bg-base)' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-body-medium" style={{ color: 'var(--text-disabled)' }}>
          {activeTab === 'favoritos' && `${tracks.length} ${tracks.length === 1 ? 'favorito' : 'favoritos'}`}
          {activeTab === 'artistas' && `${artists.length} ${artists.length === 1 ? 'artista' : 'artistas'}`}
          {activeTab === 'playlists' && `${playlists.length} ${playlists.length === 1 ? 'playlist' : 'playlists'}`}
          {activeTab === 'recentes' && `${history.length} ${history.length === 1 ? 'item' : 'itens'}`}
          {activeTab === 'baixadas' && `${downloads.length} ${downloads.length === 1 ? 'download' : 'downloads'}`}
        </span>
        {renderSortDropdown()}
      </div>

      {loading ? (
        <div className="grid [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] gap-3" role="status" aria-label="Carregando biblioteca">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : loadError ? (
        <ErrorState
          title="Não foi possível carregar sua biblioteca"
          description="Verifique sua conexão e tente novamente."
          action={{ label: 'Tentar novamente', onClick: () => { setLoadError(false); setLoading(true); setLoadAttempt((a) => a + 1) } }}
        />
      ) : (
        <>
          {activeTab === 'favoritos' && (
            tracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhum favorito ainda</p>
                <button onClick={() => router.push('/buscar')} className="btn-primary text-label-large min-h-[48px] px-6">Descobrir músicas</button>
              </div>
            ) : (
              <>
                <TrackTable tracks={getSortedTracks()} user={user} />
                {hasMore && <div ref={sentinelRef} className="h-10" />}
                {loadingMore && (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            )
          )}

          {/* Artistas tab */}
          {activeTab === 'artistas' && (
            artists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhum artista seguido ainda</p>
                <button onClick={() => router.push('/buscar?filtro=artistas')} className="btn-primary text-label-large min-h-[48px] px-6">Explorar artistas</button>
              </div>
            ) : (
              <div className="grid [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] gap-4">
                {getSortedArtists().map((a) => (
                  <div
                    key={a.artist_id}
                    className="card-hover group p-4 cursor-pointer flex flex-col items-center text-center"
                    onClick={() => router.push(`/artists/${a.artist_id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/artists/${a.artist_id}`)}
                  >
                    <div className="relative w-full aspect-square mb-3">
                      {a.artist_data?.image ? (
                        <img src={a.artist_data.image} alt={a.artist_data.name} className="w-full h-full rounded-full object-cover" loading="lazy" />
                      ) : (
                        <div
                          className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold"
                          style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
                        >
                          {a.artist_data?.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div
                        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                        style={{ background: 'var(--accent-overlay)' }}
                        aria-hidden="true"
                      >
                        <span className="text-label-large font-semibold" style={{ color: 'var(--text-on-accent)' }}>Ver artista</span>
                      </div>
                    </div>
                    <p className="font-semibold text-body-medium truncate w-full">{a.artist_data?.name ?? 'Artista'}</p>
                    <div className="mt-3">
                      <FollowButton artistId={a.artist_id} artistData={a.artist_data ?? undefined} />
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Playlists tab */}
          {activeTab === 'playlists' && (
            playlists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhuma playlist criada</p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="btn-primary text-label-large min-h-[48px] px-6"
                >
                  Criar minha primeira playlist
                </button>
              </div>
            ) : (
              <div className="grid [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] gap-4">
                {getSortedPlaylists().map((pl) => (
                  <div
                    key={pl.id}
                    className="card-hover group p-4 cursor-pointer"
                    onClick={() => router.push(`/playlists/${pl.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/playlists/${pl.id}`)}
                  >
                    <div className="relative mb-3">
                      <PlaylistCover
                        playlist={pl as any}
                        size={0}
                        className="w-full aspect-square"
                      />
                      <div
                        className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ background: 'var(--accent-overlay)' }}
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        className="absolute bottom-2 right-2 w-12 h-12 rounded-full flex items-center justify-center shadow-elevation-3 transition-transform duration-150 hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
                        onClick={(e) => { e.stopPropagation(); handlePlayPlaylist(pl) }}
                        aria-label={`Tocar playlist ${pl.name}`}
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    </div>
                    <h3 className="font-semibold text-body-large truncate">{pl.name}</h3>
                    <p className="text-body-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {pl.track_count} {pl.track_count === 1 ? 'faixa' : 'faixas'}
                    </p>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Recentes tab */}
          {activeTab === 'recentes' && (
            history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhuma música tocada ainda</p>
                <button onClick={() => router.push('/')} className="btn-primary text-label-large min-h-[48px] px-6">Comece a ouvir</button>
              </div>
            ) : (
              <TrackTable tracks={getSortedTracks(history.map((h) => h.track_data))} user={user} />
            )
          )}

          {/* Baixadas tab */}
          {activeTab === 'baixadas' && downloads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhuma música baixada ainda</p>
              <p className="text-body-medium" style={{ color: 'var(--text-disabled)' }}>Baixe músicas para ouvir offline</p>
            </div>
          )}

          {activeTab === 'baixadas' && downloads.length > 0 && (
            <TrackTable tracks={getSortedTracks(downloads)} user={user} />
          )}
        </>
      )}
      <CreatePlaylistModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </div>
  )
}

export default function BibliotecaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-3 py-10">
        <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
        <span style={{ color: 'var(--text-secondary)' }}>Carregando...</span>
      </div>
    }>
      <BibliotecaContent />
    </Suspense>
  )
}
