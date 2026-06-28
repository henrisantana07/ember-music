'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrackCard } from '@/components/TrackCard'
import { PlaylistCover } from '@/components/playlist/PlaylistCover'
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import { usePlaylistsStore } from '@/lib/playlists-store'
import { formatDuration } from '@/lib/spotify'
import { usePlayerStore } from '@/lib/store'
import { FollowButton } from '@/components/FollowButton'
import { useUser } from '@/hooks/use-user'
import type { Track } from '@/types/music'
import type { Json } from '@/types/database'
import { Suspense } from 'react'

type TabId = 'musicas' | 'artistas' | 'playlists' | 'recentes' | 'baixadas'

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
  { id: 'musicas', label: 'Músicas' },
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
  const activeTab = (searchParams.get('tab') as TabId) || 'musicas'

  const [artistSort, setArtistSort] = useState<'recent' | 'a-z' | 'popular'>('recent')
  const [playlistSort, setPlaylistSort] = useState<'recent' | 'updated' | 'a-z' | 'tracks'>('recent')
  const [trackSort, setTrackSort] = useState<'recent' | 'oldest' | 'a-z' | 'z-a' | 'artist' | 'duration'>('recent')

  const [tracks, setTracks] = useState<Track[]>([])
  const [artists, setArtists] = useState<FollowedArtist[]>([])
  const [playlists, setPlaylists] = useState<PlaylistTabItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [downloads, setDownloads] = useState<Track[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [trackOffset, setTrackOffset] = useState(0)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const { play } = usePlayerStore()

  useEffect(() => {
    if (!userLoading && !user) router.push('/login')
  }, [user, userLoading])

  const fetchTracks = useCallback(async (append = false) => {
    if (!user) return
    const offset = append ? trackOffset : 0
    setLoading(!append)
    if (append) setLoadingMore(true)

    const { data } = await supabase
      .from('favorites')
      .select('track_data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

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
    setLoading(false)
    setLoadingMore(false)
  }, [user, trackOffset])

  const fetchArtists = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('followed_artists')
      .select('*')
      .eq('user_id', user.id)
      .order('followed_at', { ascending: false })
    if (data) setArtists(data as unknown as FollowedArtist[])
    setLoading(false)
  }, [user])

  const fetchHistory = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('listening_history')
      .select('*')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(50)
    if (data) setHistory(data as unknown as HistoryItem[])
    setLoading(false)
  }, [user])

  const fetchDownloads = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('downloads')
      .select('track_data')
      .eq('user_id', user.id)
      .order('downloaded_at', { ascending: false })
    if (data) {
      const parsed = data.map((d: any) => d.track_data as unknown as Track).filter(Boolean)
      setDownloads(parsed)
    }
    setLoading(false)
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
      case 'musicas':
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
  }, [user, activeTab])

  const loadMoreTracks = useCallback(() => {
    if (activeTab === 'musicas') fetchTracks(true)
  }, [activeTab, fetchTracks])

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMoreTracks,
    hasMore: activeTab === 'musicas' && hasMore,
    loading: loadingMore,
  })

  function setTab(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'musicas') {
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
      case 'recent': return list
      case 'a-z': return list.sort((a, b) => (a.artist_data?.name ?? '').localeCompare(b.artist_data?.name ?? ''))
      case 'popular': return list
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
      case 'musicas':
      case 'recentes':
      case 'baixadas':
        return (
          <select
            value={trackSort}
            onChange={(e) => setTrackSort(e.target.value as typeof trackSort)}
            className="sort-select text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)' }}
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
            className="sort-select text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <option value="recent">Seguido recentemente</option>
            <option value="a-z">A → Z</option>
            <option value="popular">Mais popular</option>
          </select>
        )
      case 'playlists':
        return (
          <select
            value={playlistSort}
            onChange={(e) => setPlaylistSort(e.target.value as typeof playlistSort)}
            className="sort-select text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)' }}
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
    <div className="max-w-[1200px] mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Biblioteca</h1>
        {activeTab === 'playlists' && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" />
            </svg>
            Nova Playlist
          </button>
        )}
        {activeTab === 'recentes' && history.length > 0 && (
          <button
            onClick={() => { if (confirm('Limpar histórico de reprodução?')) handleClearHistory() }}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Limpar histórico
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className="tab-pill text-sm font-medium px-4 py-1.5 rounded-full transition-all duration-150 whitespace-nowrap"
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
        <span className="text-sm" style={{ color: 'var(--text-disabled)' }}>
          {activeTab === 'musicas' && `${tracks.length} ${tracks.length === 1 ? 'música' : 'músicas'}`}
          {activeTab === 'artistas' && `${artists.length} ${artists.length === 1 ? 'artista' : 'artistas'}`}
          {activeTab === 'playlists' && `${playlists.length} ${playlists.length === 1 ? 'playlist' : 'playlists'}`}
          {activeTab === 'recentes' && `${history.length} ${history.length === 1 ? 'item' : 'itens'}`}
          {activeTab === 'baixadas' && `${downloads.length} ${downloads.length === 1 ? 'download' : 'downloads'}`}
        </span>
        {renderSortDropdown()}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {/* Músicas tab */}
          {activeTab === 'musicas' && (
            tracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhuma música favoritada ainda</p>
                <button onClick={() => router.push('/buscar')} className="btn-primary text-sm">Descobrir músicas</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {getSortedTracks().map((track) => (
                    <TrackCard key={track.id} track={track} tracks={tracks} user={user} />
                  ))}
                </div>
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
                <button onClick={() => router.push('/buscar?filtro=artistas')} className="btn-primary text-sm">Explorar artistas</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
                        style={{ background: 'linear-gradient(135deg, #FF6A0044, #FFC40044)' }}
                      >
                        <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-150 group-hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}>
                          <svg className="w-5 h-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="font-semibold text-sm truncate w-full">{a.artist_data?.name ?? 'Artista'}</p>
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
                  className="btn-primary text-sm"
                >
                  Criar minha primeira playlist
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {getSortedPlaylists().map((pl) => (
                  <div
                    key={pl.id}
                    className="card-hover group p-3 cursor-pointer"
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
                        className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #FF6A0044, #FFC40044)' }}
                      >
                        <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-150 group-hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}>
                          <svg className="w-5 h-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm truncate">{pl.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
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
                <button onClick={() => router.push('/')} className="btn-primary text-sm">Comece a ouvir</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {history.map((item) => (
                  <TrackCard
                    key={`${item.track_data.id}-${item.played_at}`}
                    track={item.track_data}
                    tracks={history.map((h) => h.track_data)}
                    user={user}
                  />
                ))}
              </div>
            )
          )}

          {/* Baixadas tab */}
          {activeTab === 'baixadas' && downloads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhuma música baixada ainda</p>
              <p className="text-sm" style={{ color: 'var(--text-disabled)' }}>Baixe músicas para ouvir offline</p>
            </div>
          )}

          {activeTab === 'baixadas' && downloads.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {getSortedTracks(downloads).map((track) => (
                <TrackCard key={track.id} track={track} tracks={downloads} user={user} />
              ))}
            </div>
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
