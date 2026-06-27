'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Track, Album, Artist } from '@/types/music'
import { ExploreTabs } from './ExploreTabs'
import { ExploreFilters } from './ExploreFilters'
import { TopResultCard } from './TopResultCard'
import { TrackResultGrid } from './TrackResultGrid'
import { ArtistResultCarousel } from './ArtistResultCarousel'
import { AlbumResultGrid } from './AlbumResultGrid'
import { ExploreNoResults } from './ExploreNoResults'
import { ExploreTrackSkeleton } from './skeletons/ExploreTrackSkeleton'
import { ArtistCircleSkeleton } from './skeletons/ArtistCircleSkeleton'

type DurationFilter = '' | 'short' | 'medium' | 'long'

function matchesDuration(track: Track, duration: DurationFilter) {
  if (!duration) return true
  if (duration === 'short') return track.duration <= 120
  if (duration === 'medium') return track.duration > 120 && track.duration <= 300
  return track.duration > 300
}

function matchesYear(track: Track, year: string) {
  if (!year) return true
  return track.album_name?.includes(year) || false
}

interface ExploreResultsProps {
  query: string
  onTabChange: (tab: string) => void
  activeTab: string
}

export function ExploreResults({ query, onTabChange, activeTab }: ExploreResultsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const artistFilter = searchParams.get('artist') ?? ''
  const durationFilter = (searchParams.get('duration') ?? '') as DurationFilter
  const yearFilter = searchParams.get('year') ?? ''

  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)

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
      } catch {
        // ignore
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void fetchResults()
    return () => controller.abort()
  }, [query])

  const filteredTracks = useMemo(() => tracks.filter(t => {
    const artistOk = !artistFilter || t.artist_name.toLowerCase().includes(artistFilter.toLowerCase())
    return artistOk && matchesDuration(t, durationFilter) && matchesYear(t, yearFilter)
  }), [tracks, artistFilter, durationFilter, yearFilter])

  const filteredAlbums = useMemo(() => albums.filter(a => {
    return !artistFilter || a.artist_name.toLowerCase().includes(artistFilter.toLowerCase())
  }), [albums, artistFilter])

  const filteredArtists = useMemo(() => artists.filter(a => {
    return !artistFilter || a.name.toLowerCase().includes(artistFilter.toLowerCase())
  }), [artists, artistFilter])

  const counts = {
    total: filteredTracks.length + filteredAlbums.length + filteredArtists.length,
    tracks: filteredTracks.length,
    artists: filteredArtists.length,
    albums: filteredAlbums.length,
  }

  const activeFilterCount = Number(!!artistFilter) + Number(!!durationFilter) + Number(!!searchParams.get('genre')) + Number(!!yearFilter)

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString())
    ;['artist', 'genre', 'duration', 'year'].forEach((k) => params.delete(k))
    router.replace(`/buscar?${params.toString()}`)
  }

  const hasResults = filteredTracks.length > 0 || filteredArtists.length > 0 || filteredAlbums.length > 0

  if (!hasResults && !loading) {
    return <ExploreNoResults query={query} activeFilterCount={activeFilterCount} onClearFilters={clearFilters} />
  }

  return (
    <div
      className="mx-auto space-y-6"
      style={{ maxWidth: 1100, paddingLeft: 32, paddingRight: 32 }}
    >
      <div>
        <p className="text-sm mb-1" style={{ color: 'var(--text-disabled)' }}>Resultados para</p>
        <h1 className="text-3xl font-bold">&ldquo;{query}&rdquo;</h1>
      </div>

      <ExploreTabs activeTab={activeTab} onTabChange={onTabChange} counts={counts} />
      <ExploreFilters />

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
                {filteredTracks.map((track, index) => {
                  const isActive = false
                  return (
                    <tr
                      key={track.id}
                      className="group cursor-pointer transition-colors hover:bg-white/5"
                    >
                      <td className="text-right pr-3 py-2 text-sm" style={{ color: 'var(--text-disabled)' }}>
                        <span className="group-hover:hidden">{index + 1}</span>
                        <span className="hidden group-hover:inline" style={{ color: 'var(--accent-solid)' }}>
                          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                      </td>
                      <td className="pr-3 py-2">
                        <img src={track.image} alt="" className="w-12 h-12 rounded object-cover" loading="lazy" />
                      </td>
                      <td className="py-2 font-medium truncate max-w-[200px]">{track.name}</td>
                      <td className="py-2 truncate max-w-[150px] hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{track.artist_name}</td>
                      <td className="py-2 truncate max-w-[150px] hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>{track.album_name}</td>
                      <td className="text-right py-2" style={{ color: 'var(--text-disabled)' }}>
                        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                      </td>
                      <td className="py-2 text-center">
                        <svg className="w-4 h-4 inline" style={{ color: 'var(--text-disabled)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </td>
                      <td className="py-2 text-center">
                        <svg className="w-4 h-4 inline" style={{ color: 'var(--text-disabled)' }} fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredTracks.length > 20 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button className="px-4 py-2 rounded-full text-sm font-semibold border" style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }} disabled>← Anterior</button>
              <button className="px-4 py-2 rounded-full text-sm font-semibold border" style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>Próxima →</button>
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
  )
}
