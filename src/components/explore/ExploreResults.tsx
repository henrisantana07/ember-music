'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Track, Album, Artist } from '@/types/music'
import type { Json } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { ExploreTabs } from './ExploreTabs'
import { ExploreFilters } from './ExploreFilters'
import { TopResultCard } from './TopResultCard'
import { TrackResultGrid } from './TrackResultGrid'
import { ArtistResultCarousel } from './ArtistResultCarousel'
import { AlbumResultGrid } from './AlbumResultGrid'
import { ExploreNoResults } from './ExploreNoResults'
import { ExploreTrackSkeleton } from './skeletons/ExploreTrackSkeleton'
import { ArtistCircleSkeleton } from './skeletons/ArtistCircleSkeleton'
import { PlaylistModal } from '@/components/PlaylistModal'

type DurationFilter = '' | 'short' | 'medium' | 'long'

function matchesDuration(track: Track, duration: DurationFilter) {
  if (!duration) return true
  if (duration === 'short') return track.duration <= 120
  if (duration === 'medium') return track.duration > 120 && track.duration <= 300
  return track.duration > 300
}

interface ExploreResultsProps {
  query: string
  onTabChange: (tab: string) => void
  activeTab: string
  artistFilter: string
  genreFilter: string
  durationFilter: DurationFilter
  onClearFilters: () => void
}

export function ExploreResults({ query, onTabChange, activeTab, artistFilter, genreFilter, durationFilter, onClearFilters }: ExploreResultsProps) {

  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [favs, setFavs] = useState<Set<string>>(new Set())
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    if (!user) { setFavs(new Set()); return }
    const ids = filteredTracks.map(t => t.id)
    if (ids.length === 0) return
    supabase.from('favorites').select('track_id').eq('user_id', user.id).in('track_id', ids)
      .then(({ data }) => setFavs(new Set(data?.map(d => d.track_id) ?? [])))
  }, [user, tracks])

  async function handleFavorite(e: React.MouseEvent, track: Track) {
    e.stopPropagation()
    if (!user) return
    if (favs.has(track.id)) {
      await supabase.from('favorites').delete().eq('track_id', track.id).eq('user_id', user.id)
      setFavs(prev => { const n = new Set(prev); n.delete(track.id); return n })
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, track_id: track.id, track_data: track as unknown as Json })
      setFavs(prev => { const n = new Set(prev); n.add(track.id); return n })
    }
  }

  useEffect(() => {
    if (!query) return
    const controller = new AbortController()
    setLoading(true)
    async function fetchResults() {
      try {
        const encoded = encodeURIComponent(query)
        const [trackRes, albumRes, artistRes] = await Promise.all([
          fetch(`/api/spotify?endpoint=search&q=${encoded}&type=track&limit=50`, { signal: controller.signal }),
          fetch(`/api/spotify?endpoint=search&q=${encoded}&type=album&limit=20`, { signal: controller.signal }),
          fetch(`/api/spotify?endpoint=search&q=${encoded}&type=artist&limit=12`, { signal: controller.signal }),
        ])
        const [trackData, albumData, artistData] = await Promise.all([
          trackRes.ok ? trackRes.json() : { tracks: [] },
          albumRes.ok ? albumRes.json() : { albums: [] },
          artistRes.ok ? artistRes.json() : { artists: [] },
        ])
        setTracks(trackData.tracks ?? [])
        setAlbums(albumData.albums ?? [])
        setArtists(artistData.artists ?? [])
      } catch (e) {
        console.error('Erro ao buscar resultados:', e)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void fetchResults()
    return () => controller.abort()
  }, [query])

  useEffect(() => { setPage(0) }, [query, artistFilter, genreFilter, durationFilter])

  const genreArtistNames = useMemo(() => {
    if (!genreFilter) return null
    const names = artists.filter(a => a.genres?.some(g => g.toLowerCase() === genreFilter)).map(a => a.name.toLowerCase())
    if (names.length === 0) return null
    return new Set(names)
  }, [artists, genreFilter])

  const filteredTracks = useMemo(() => tracks.filter(t => {
    const artistOk = !artistFilter || t.artist_name.toLowerCase().includes(artistFilter.toLowerCase())
    const genreOk = !genreArtistNames || genreArtistNames.has(t.artist_name.toLowerCase())
    return artistOk && genreOk && matchesDuration(t, durationFilter)
  }), [tracks, artistFilter, genreArtistNames, durationFilter])

  const filteredAlbums = useMemo(() => albums.filter(a => {
    if (artistFilter && !a.artist_name.toLowerCase().includes(artistFilter.toLowerCase())) return false
    if (genreArtistNames && !genreArtistNames.has(a.artist_name.toLowerCase())) return false
    return true
  }), [albums, artistFilter, genreArtistNames])

  const filteredArtists = useMemo(() => artists.filter(a => {
    if (artistFilter && !a.name.toLowerCase().includes(artistFilter.toLowerCase())) return false
    if (genreFilter && !a.genres?.some(g => g.toLowerCase() === genreFilter)) return false
    return true
  }), [artists, artistFilter, genreFilter])

  const paginatedTracks = useMemo(() => filteredTracks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filteredTracks, page])
  const totalPages = Math.max(1, Math.ceil(filteredTracks.length / PAGE_SIZE))

  const counts = {
    total: filteredTracks.length + filteredAlbums.length + filteredArtists.length,
    tracks: filteredTracks.length,
    artists: filteredArtists.length,
    albums: filteredAlbums.length,
  }

  const activeFilterCount = Number(!!artistFilter) + Number(!!genreFilter) + Number(!!durationFilter)

  const hasResults = filteredTracks.length > 0 || filteredArtists.length > 0 || filteredAlbums.length > 0

  if (!hasResults && !loading) {
    return <ExploreNoResults query={query} activeFilterCount={activeFilterCount} onClearFilters={onClearFilters} />
  }

  return (
    <><div
      className="mx-auto max-w-[1100px] px-8 space-y-6"
    >
      <div>
        <p className="text-sm mb-1" style={{ color: 'var(--text-disabled)' }}>Resultados para</p>
        <h1 className="text-3xl font-bold">&ldquo;{query}&rdquo;</h1>
      </div>

      <ExploreTabs activeTab={activeTab} onTabChange={onTabChange} counts={counts} />
      <ExploreFilters tracks={tracks} albums={albums} artists={artists} />

      {activeTab === 'tudo' && (
        <div className="space-y-10">
          {filteredTracks.length > 0 && (
            <section>
              <TopResultCard track={filteredTracks[0]} />
            </section>
          )}
          {filteredTracks.length > 1 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Faixas</h2>
                <button onClick={() => onTabChange('faixas')} className="text-xs font-semibold" style={{ color: 'var(--accent-solid)' }}>Ver tudo →</button>
              </div>
              <TrackResultGrid tracks={filteredTracks.slice(1, 7)} />
            </section>
          )}
          {filteredArtists.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Artistas</h2>
                <button onClick={() => onTabChange('artistas')} className="text-xs font-semibold" style={{ color: 'var(--accent-solid)' }}>Ver tudo →</button>
              </div>
              <ArtistResultCarousel artists={filteredArtists} maxItems={8} />
            </section>
          )}
          {filteredAlbums.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Álbuns</h2>
                <button onClick={() => onTabChange('albuns')} className="text-xs font-semibold" style={{ color: 'var(--accent-solid)' }}>Ver tudo →</button>
              </div>
              <AlbumResultGrid albums={filteredAlbums} maxItems={4} />
            </section>
          )}
        </div>
      )}

      {activeTab === 'faixas' && (
        <section>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
                  <th className="text-right pr-3 py-2 w-10">Nº</th>
                  <th className="pr-3 py-2 w-12" />
                  <th className="text-left py-2">Título</th>
                  <th className="text-left py-2 hidden sm:table-cell">Artista</th>
                  <th className="text-left py-2 hidden md:table-cell">Álbum</th>
                  <th className="text-right py-2 w-16">Duração</th>
                  <th className="py-2 w-10" />
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {paginatedTracks.map((track, index) => {
                  const isActive = false
                  const rowIndex = page * PAGE_SIZE + index + 1
                  return (
                    <tr
                      key={track.id}
                      className="group cursor-pointer transition-colors hover:bg-white/5"
                    >
                      <td className="text-right pr-3 py-2 text-sm" style={{ color: 'var(--text-disabled)' }}>
                        <span className="group-hover:hidden">{rowIndex}</span>
                        <span className="hidden group-hover:inline" style={{ color: 'var(--accent-solid)' }}>
                          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                      </td>
                      <td className="pr-3 py-2">
                        <img src={track.image} alt="" className="w-12 h-12 rounded-md object-cover" loading="lazy" />
                      </td>
                      <td className="py-2 font-medium truncate max-w-[200px]">{track.name}</td>
                      <td className="py-2 truncate max-w-[150px] hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{track.artist_name}</td>
                      <td className="py-2 truncate max-w-[150px] hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>{track.album_name}</td>
                      <td className="text-right py-2" style={{ color: 'var(--text-disabled)' }}>
                        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                      </td>
                      <td className="py-2 text-center">
                        {user && (
                          <button onClick={(e) => handleFavorite(e, track)} className="p-1">
                            <svg
                              className="w-4 h-4 transition-colors duration-150"
                              fill={favs.has(track.id) ? `url(#favTb${track.id.replace(/[^a-zA-Z0-9]/g, '')})` : 'none'}
                              viewBox="0 0 24 24"
                              stroke={favs.has(track.id) ? 'none' : 'currentColor'}
                              strokeWidth={2}
                              style={favs.has(track.id) ? {} : { color: 'var(--text-disabled)' }}
                            >
                              <defs>
                                <linearGradient id={`favTb${track.id.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="var(--accent-from)" />
                                  <stop offset="100%" stopColor="var(--accent-to)" />
                                </linearGradient>
                              </defs>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        {user && (
                          <button onClick={(e) => { e.stopPropagation(); setPlaylistTrack(track) }} className="p-1" title="Adicionar à playlist">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-disabled)' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredTracks.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded-full text-sm font-semibold border transition-opacity disabled:opacity-40"
                style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >← Anterior</button>
              <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 rounded-full text-sm font-semibold border transition-opacity disabled:opacity-40"
                style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >Próxima →</button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'artistas' && (
        <section>
          <ArtistResultCarousel artists={filteredArtists} />
          {filteredArtists.length > 8 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
              {filteredArtists.slice(8).map((artist) => (
                <a
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-colors hover:bg-white/5 group"
                >
                  <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-2 transition-colors group-hover:border-transparent" style={{ borderColor: 'var(--bg-elevated)' }}>
                    <img src={artist.image || '/placeholder.svg'} alt={artist.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className="text-sm font-semibold text-center truncate w-full">{artist.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {artist.followers > 0 ? `${(artist.followers / 1000).toFixed(0)}K fãs` : ''}
                  </p>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'albuns' && (
        <section>
          <AlbumResultGrid albums={filteredAlbums} />
        </section>
      )}
    </div>
      {playlistTrack && (
        <PlaylistModal open={!!playlistTrack} onClose={() => setPlaylistTrack(null)} track={playlistTrack} />
      )}
    </>
  )
}
