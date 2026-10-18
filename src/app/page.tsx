'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { SectionRow } from '@/components/SectionRow'
import { ArtistRow } from '@/components/ArtistRow'
import { AlbumRow } from '@/components/AlbumRow'
import { TrackCardSkeleton } from '@/components/Skeleton'
import { Carousel, CarouselItem } from '@/components/Carousel'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { Lottie } from '@/components/ui/LottieLazy'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import { useUser } from '@/hooks/use-user'
import { getPlaybackHistory } from '@/lib/playback-history'
import {
  rankArtistsFromHistory,
  tracksFromHistory,
  albumsFromHistory,
  interleave,
  dedupe,
} from '@/lib/personalized-rows'
import type { Track, Album, Artist, Genre } from '@/types/music'
import { getGenreGradient } from '@/constants/genreColors'

const GENRE_NAMES = ['pop', 'rock', 'electronic', 'jazz', 'hip hop', 'classical', 'reggae', 'blues', 'metal', 'folk', 'country', 'soul', 'punk', 'alternative', 'indie', 'r&b', 'latin', 'dance', 'ambient', 'funk']

function HomePageInner() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q')

  if (query) {
    return <SearchResults query={query} />
  }

  return <HomeContent />
}

function SearchResults({ query }: { query: string }) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchResults() {
      if (!query.trim()) return
      setLoading(true)
      try {
        const [trackRes, albumRes, artistRes] = await Promise.all([
          fetch(`/api/youtube?endpoint=search&q=${encodeURIComponent(query)}&type=track&limit=20`),
          fetch(`/api/youtube?endpoint=search&q=${encodeURIComponent(query)}&type=album&limit=8`),
          fetch(`/api/youtube?endpoint=search&q=${encodeURIComponent(query)}&type=artist&limit=8`),
        ])
        if (trackRes.ok) {
          const data = await trackRes.json()
          setTracks(data.tracks ?? [])
        }
        if (albumRes.ok) {
          const data = await albumRes.json()
          setAlbums(data.albums ?? [])
        }
        if (artistRes.ok) {
          const data = await artistRes.json()
          setArtists(data.artists ?? [])
        }
      } catch (e) {
        console.error('Erro ao buscar resultados:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchResults()
  }, [query])

  if (!loading && tracks.length === 0 && albums.length === 0 && artists.length === 0) {
    return (
      <EmptyState
        icon={<Lottie name="record" loop className="h-full w-full" />}
        title={`Nenhum resultado encontrado para \u201C${query}\u201D`}
        description="Confira a grafia ou tente outro termo."
      />
    )
  }

  return (
    <>
      <p className="text-sm mb-6" style={{ color: 'var(--text-disabled)' }}>
        Resultados para &ldquo;{query}&rdquo;
      </p>

      {loading ? (
        <LoadingState title="Buscando resultados…" />
      ) : (
        <>
          {tracks.length > 0 && <SectionRow title="Músicas" tracks={tracks} />}

          {artists.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold mb-4">Artistas</h2>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar">
                {artists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artists/${artist.id}`}
                    className="flex flex-col items-center gap-2 w-32 flex-shrink-0 group"
                  >
                    <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-2 transition-colors duration-200 group-hover:border-transparent"
                      style={{ borderColor: 'var(--bg-elevated)' }}>
                      <img
                        src={artist.image || '/placeholder.svg'}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-body-large font-semibold text-center truncate w-full">{artist.name}</p>
                    {artist.followers > 0 && (
                      <p className="text-body-medium text-center" style={{ color: 'var(--text-secondary)' }}>
                        {(artist.followers / 1000).toFixed(0)}K fãs
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {albums.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold mb-4">Álbuns</h2>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar">
                {albums.map((album) => (
                  <Link
                    key={album.id}
                    href={`/albums/${album.id}`}
                    className="flex-shrink-0 w-44 p-4 rounded-xl transition-colors hover:bg-state-hover group relative"
                  >
                    <div className="relative mb-3">
                      <img
                        src={album.image || '/placeholder.svg'}
                        alt={album.name}
                        className="w-full aspect-square rounded-lg object-cover shadow-md"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-body-large font-medium truncate">{album.name}</p>
                    <p className="text-body-medium truncate" style={{ color: 'var(--text-secondary)' }}>{album.artist_name}</p>
                    {album.release_date && (
                      <p className="text-body-medium" style={{ color: 'var(--text-disabled)' }}>{album.release_date.slice(0, 4)}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  )
}

function HomeContent() {
  const [trending, setTrending] = useState<Track[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [moreTracks, setMoreTracks] = useState<Track[]>([])
  const [moreLoading, setMoreLoading] = useState(false)
  const [loadedGenres, setLoadedGenres] = useState<Set<number>>(new Set())
  const [initialLoading, setInitialLoading] = useState(true)

  // Fileiras personalizadas. O histórico responde rápido e pinta na hora;
  // o detalhamento dos5 canais custa uma chamada por artista e chega depois,
  // agrupado num único estado para não empurrar o conteúdo embaixo repetido.
  const { user } = useUser()
  const [topArtists, setTopArtists] = useState<Artist[]>([])
  const [topTracks, setTopTracks] = useState<Track[]>([])
  const [heardAlbums, setHeardAlbums] = useState<Album[]>([])
  const [picks, setPicks] = useState<{ tracks: Track[]; albums: Album[]; artists: Artist[] } | null>(null)

  useEffect(() => {
    async function fetchHome() {
      try {
        const [trendingRes, genresRes, artistsRes] = await Promise.all([
          fetch('/api/youtube?endpoint=featured&limit=12'),
          fetch('/api/youtube?endpoint=genres'),
          fetch('/api/youtube?endpoint=charts/artists&limit=12'),
        ])
        if (trendingRes.ok) {
          const data = await trendingRes.json()
          setTrending(data.results ?? [])
        }
        if (genresRes.ok) {
          const data = await genresRes.json()
          const all = data.results ?? []
          setGenres(all.filter((g: Genre) => g.name && !g.name.includes('undefined')).slice(0, 20))
        }
        if (artistsRes.ok) {
          const data = await artistsRes.json()
          setArtists(data.results ?? [])
        }
      } catch (e) {
        console.error('Erro ao carregar página inicial:', e)
      } finally {
        setInitialLoading(false)
      }
    }
    fetchHome()
  }, [])

  useEffect(() => {
    const currentUser = user
    if (!currentUser) return
    let cancelled = false

    async function loadPersonalized() {
      const history = await getPlaybackHistory(currentUser, 300)
      if (cancelled) return

      const artists = rankArtistsFromHistory(history)
      setTopArtists(artists)
      setTopTracks(tracksFromHistory(history))
      setHeardAlbums(albumsFromHistory(history))

      const top5 = artists.slice(0, 5)
      if (top5.length === 0) return

      try {
        const responses = await Promise.all(
          top5.map((artist) =>
            fetch(`/api/youtube?endpoint=artists&id=${encodeURIComponent(artist.id)}&limit=50`),
          ),
        )
        const payloads = await Promise.all(responses.map((res) => (res.ok ? res.json() : null)))
        if (cancelled) return

        // Um único setState: as três fileiras da API aparecem juntas e o
        // conteúdo editorial embaixo desloca só uma vez.
        setPicks({
          tracks: dedupe(interleave(payloads.map((p) => (p?.top_tracks ?? []) as Track[]))),
          albums: dedupe(interleave(payloads.map((p) => (p?.albums ?? []) as Album[]))),
          artists: dedupe(interleave(payloads.map((p) => (p?.related ?? []) as Artist[]))),
        })
      } catch (e) {
        console.error('Erro ao montar fileiras personalizadas:', e)
      }
    }

    loadPersonalized()
    return () => {
      cancelled = true
    }
  }, [user])

  const hasMore = loadedGenres.size < GENRE_NAMES.length

  const loadMore = useCallback(async () => {
    if (moreLoading || !hasMore) return
    setMoreLoading(true)
    const available = GENRE_NAMES.map((_, i) => i).filter((i) => !loadedGenres.has(i))
    if (available.length === 0) { setMoreLoading(false); return }
    const idx = available[Math.floor(Math.random() * available.length)]
    const genre = GENRE_NAMES[idx]
    try {
      const res = await fetch(`/api/youtube?endpoint=search&q=${encodeURIComponent(genre)}&type=track&limit=12`)
      if (res.ok) {
        const data = await res.json()
        const tracks = data.tracks ?? []
        setMoreTracks((prev) => [...prev, ...tracks])
        setLoadedGenres((prev) => new Set(prev).add(idx))
      }
    } catch (e) {
      console.error('Erro ao carregar mais faixas:', e)
    } finally {
      setMoreLoading(false)
    }
  }, [moreLoading, hasMore, loadedGenres])

  const { sentinelRef } = useInfiniteScroll({ onLoadMore: loadMore, hasMore, loading: moreLoading })

  if (initialLoading) {
    return <LoadingState title="Carregando sua seleção…" />
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Bem-vindo ao Ember Music</h1>
        <p className="text-body-medium" style={{ color: 'var(--text-secondary)' }}>Descubra música com Ember Music!</p>
      </div>

      {/* Personalizadas do histórico — chegam junto com o primeiro paint */}
      {topArtists.length > 0 && <ArtistRow title="Artistas mais ouvidos" artists={topArtists} />}
      {topTracks.length > 0 && <SectionRow title="Faixas mais tocadas" tracks={topTracks} />}
      {heardAlbums.length > 0 && <AlbumRow title="Álbuns que você ouviu" albums={heardAlbums} />}

      {/* Personalizadas dos5 mais ouvidos — resolvem juntas num lote só */}
      {picks && picks.tracks.length > 0 && <SectionRow title="Faixas dos seus mais ouvidos" tracks={picks.tracks} />}
      {picks && picks.albums.length > 0 && <AlbumRow title="Álbuns dos seus mais ouvidos" albums={picks.albums} />}
      {picks && picks.artists.length > 0 && <ArtistRow title="Artistas parecidos com seus mais ouvidos" artists={picks.artists} />}

      {trending.length > 0 && (
        <SectionRow title="Em alta" tracks={trending} />
      )}

      {genres.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Gêneros musicais</h2>
          <Carousel>
            {genres.map((genre, index) => {
              const gradient = getGenreGradient(genre.name)
              return (
                <CarouselItem key={genre.id} index={index} className="w-52 flex-shrink-0">
                  <Link
                    href={`/buscar?q=${encodeURIComponent(genre.name)}`}
                    className="relative block p-3 rounded-xl text-center transition-transform hover:scale-105 overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div
                      className="w-full aspect-square rounded-lg mb-2"
                      style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
                    />
                    <p className="text-body-medium font-semibold truncate">{genre.name}</p>
                  </Link>
                </CarouselItem>
              )
            })}
          </Carousel>
        </section>
      )}

      {artists.length > 0 && <ArtistRow title="Artistas do momento" artists={artists} />}

      {moreTracks.length > 0 && (
        <SectionRow title="Descubra mais" tracks={moreTracks} />
      )}

      {moreLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
    </>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="w-48 h-5 rounded mb-3" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, j) => <TrackCardSkeleton key={j} />)}
            </div>
          </div>
        ))}
      </div>
    }>
      <HomePageInner />
    </Suspense>
  )
}
