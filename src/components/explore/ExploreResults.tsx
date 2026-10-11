'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import type { Track, Album, Artist } from '@/types/music'
import { filterByGenre, isRelevantToGenre, albumToCatalogItem, artistToCatalogItem, trackToCatalogItem } from '@/lib/genre-curation'
import { CoverImage } from '@/components/ui/CoverImage'
import { CATALOG_GRID } from '@/components/ui/grid'
import { createClient } from '@/lib/supabase/client'
import { useEnsureFavorites, useFavoritesSync } from '@/lib/favorites-store'
import { TrackTable } from '@/components/TrackTable'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/states'
import { ExploreTabs } from './ExploreTabs'
import { ExploreFilters } from './ExploreFilters'
import { TopResultCard } from './TopResultCard'
import { TrackResultGrid } from './TrackResultGrid'
import { ArtistResultCarousel } from './ArtistResultCarousel'
import { AlbumResultGrid } from './AlbumResultGrid'
import { ExploreNoResults } from './ExploreNoResults'

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
  const [searchError, setSearchError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20
  const supabase = createClient()

  const loadingRef = useRef(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const genreMatchedTracks = useMemo(
    () => filterByGenre(tracks, genreFilter, (t) => trackToCatalogItem(t)),
    [tracks, genreFilter]
  )

  const genreMatchedArtistIds = useMemo(
    () => new Set(genreMatchedTracks.map((t) => t.artist_id)),
    [genreMatchedTracks]
  )

  const filteredTracks = useMemo(() => genreMatchedTracks.filter(t => {
    const artistOk = !artistFilter || t.artist_name.toLowerCase().includes(artistFilter.toLowerCase())
    return artistOk && matchesDuration(t, durationFilter)
  }), [genreMatchedTracks, artistFilter, durationFilter])

  const filteredAlbums = useMemo(() => albums.filter(a => {
    if (artistFilter && !a.artist_name.toLowerCase().includes(artistFilter.toLowerCase())) return false
    if (genreFilter && !isRelevantToGenre(albumToCatalogItem(a), genreFilter) && !genreMatchedArtistIds.has(a.artist_id)) return false
    return true
  }), [albums, artistFilter, genreFilter, genreMatchedArtistIds])

  const filteredArtists = useMemo(() => artists.filter(a => {
    if (artistFilter && !a.name.toLowerCase().includes(artistFilter.toLowerCase())) return false
    if (genreFilter && !isRelevantToGenre(artistToCatalogItem(a), genreFilter) && !genreMatchedArtistIds.has(a.id)) return false
    return true
  }), [artists, artistFilter, genreFilter, genreMatchedArtistIds])

  const allTracks = useMemo(() => filteredTracks, [filteredTracks])
  useFavoritesSync(user?.id)
  useEnsureFavorites(allTracks.map(t => t.id))

  useEffect(() => {
    if (!query) {
      setTracks([])
      setAlbums([])
      setArtists([])
      loadingRef.current = false
      setLoading(false)
      return
    }
    const controller = new AbortController()
    loadingRef.current = true
    setLoading(true)
    async function fetchResults() {
      try {
        const encoded = encodeURIComponent(query)
        const [trackRes, albumRes, artistRes] = await Promise.all([
          fetch(`/api/youtube?endpoint=search&q=${encoded}&type=track&limit=50`, { signal: controller.signal }),
          fetch(`/api/youtube?endpoint=search&q=${encoded}&type=album&limit=20`, { signal: controller.signal }),
          fetch(`/api/youtube?endpoint=search&q=${encoded}&type=artist&limit=12`, { signal: controller.signal }),
        ])
        const [trackData, albumData, artistData] = await Promise.all([
          trackRes.ok ? trackRes.json() : { tracks: [] },
          albumRes.ok ? albumRes.json() : { albums: [] },
          artistRes.ok ? artistRes.json() : { artists: [] },
        ])
        if (!controller.signal.aborted) {
          setTracks(trackData.tracks ?? [])
          setAlbums(albumData.albums ?? [])
          setArtists(artistData.artists ?? [])
          loadingRef.current = false
          setLoading(false)
          setSearchError(false)
        }
      } catch (e) {
        console.error('Erro ao buscar resultados:', e)
        if (!controller.signal.aborted) {
          loadingRef.current = false
          setLoading(false)
          setSearchError(true)
        }
      }
    }
    void fetchResults()
    return () => controller.abort()
  }, [query, retryCount])

  useEffect(() => { setPage(p => 0) }, [query, artistFilter, genreFilter, durationFilter])

  const activeFilterCount = Number(!!artistFilter) + Number(!!genreFilter) + Number(!!durationFilter)

  const counts = {
    total: filteredTracks.length + filteredAlbums.length + filteredArtists.length,
    tracks: filteredTracks.length,
    artists: filteredArtists.length,
    albums: filteredAlbums.length,
  }

  const paginatedTracks = useMemo(() => allTracks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [allTracks, page])
  const totalPages = Math.max(1, Math.ceil(allTracks.length / PAGE_SIZE))

  const hasResults = filteredTracks.length > 0 || filteredArtists.length > 0 || filteredAlbums.length > 0

  if (searchError && !loading && !hasResults) {
    return (
      <div className="w-full">
        <ErrorState
          title="Não foi possível buscar agora"
          description="Verifique sua conexão e tente novamente."
          action={{ label: 'Tentar novamente', onClick: () => { setSearchError(false); setLoading(true); setRetryCount((c) => c + 1) } }}
        />
      </div>
    )
  }

  if (!hasResults && !loading) {
    return <ExploreNoResults query={query} activeFilterCount={activeFilterCount} onClearFilters={onClearFilters} />
  }

  return (
    <><div
      className="w-full space-y-6"
    >
      <div>
        <p className="text-body-medium mb-1" style={{ color: 'var(--text-disabled)' }}>Resultados para</p>
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
                <button onClick={() => onTabChange('faixas')} className="text-label-medium font-semibold px-3 min-h-[44px] rounded-full state-layer" style={{ color: 'var(--accent-solid)' }}>Ver tudo →</button>
              </div>
              <TrackResultGrid tracks={filteredTracks.slice(1, 7)} />
            </section>
          )}
          {filteredArtists.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Artistas</h2>
                <button onClick={() => onTabChange('artistas')} className="text-label-medium font-semibold px-3 min-h-[44px] rounded-full state-layer" style={{ color: 'var(--accent-solid)' }}>Ver tudo →</button>
              </div>
              <ArtistResultCarousel artists={filteredArtists} maxItems={8} />
            </section>
          )}
          {filteredAlbums.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Álbuns</h2>
                <button onClick={() => onTabChange('albuns')} className="text-label-medium font-semibold px-3 min-h-[44px] rounded-full state-layer" style={{ color: 'var(--accent-solid)' }}>Ver tudo →</button>
              </div>
              <AlbumResultGrid albums={filteredAlbums} maxItems={4} />
            </section>
          )}
        </div>
      )}

      {activeTab === 'faixas' && (
        <section>
          <TrackTable
            tracks={paginatedTracks}
            user={user}
            empty={{
              title: 'Nenhuma faixa encontrada',
              description: 'Tente outro termo ou remova os filtros ativos.',
              action: { label: 'Limpar filtros', onClick: onClearFilters },
            }}
          />
          {allTracks.length > PAGE_SIZE && (
            <nav className="flex items-center justify-center gap-4 mt-6" aria-label="Paginação de faixas">
              <Button
                variant="outlined"
                size="md"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="Página anterior"
              >
                ← Anterior
              </Button>
              <span className="text-body-medium" aria-live="polite" style={{ color: 'var(--text-disabled)' }}>
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outlined"
                size="md"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                aria-label="Próxima página"
              >
                Próxima →
              </Button>
            </nav>
          )}
        </section>
      )}

      {activeTab === 'artistas' && (
        <section>
          <ArtistResultCarousel artists={filteredArtists} />
          {filteredArtists.length > 8 && (
            <div className={`${CATALOG_GRID} mt-4`}>
              {filteredArtists.slice(8).map((artist) => (
                <a
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-colors hover:bg-state-hover group"
                >
                  <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-2 transition-colors group-hover:border-transparent" style={{ borderColor: 'var(--bg-elevated)' }}>
                    <CoverImage src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-body-large font-semibold text-center truncate w-full">{artist.name}</p>
                  <p className="text-body-medium" style={{ color: 'var(--text-secondary)' }}>
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
    </>
  )
}
