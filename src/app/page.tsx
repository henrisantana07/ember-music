'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { SectionRow } from '@/components/SectionRow'
import { TrackCardSkeleton } from '@/components/Skeleton'
import { FollowButton } from '@/components/FollowButton'
import { Carousel } from '@/components/Carousel'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import type { Track, Album, Artist, Genre } from '@/types/music'

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
          fetch(`/api/deezer?endpoint=search&q=${encodeURIComponent(query)}&type=track&limit=20`),
          fetch(`/api/deezer?endpoint=search&q=${encodeURIComponent(query)}&type=album&limit=8`),
          fetch(`/api/deezer?endpoint=search&q=${encodeURIComponent(query)}&type=artist&limit=8`),
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
    return <p className="text-center py-10" style={{ color: 'var(--text-disabled)' }}>Nenhum resultado encontrado para &ldquo;{query}&rdquo;</p>
  }

  return (
    <>
      <p className="text-sm mb-6" style={{ color: 'var(--text-disabled)' }}>
        Resultados para &ldquo;{query}&rdquo;
      </p>

      {loading ? (
        <>
          <div className="mb-8">
            <div className="w-36 h-5 rounded mb-3" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
            </div>
          </div>
        </>
      ) : (
        <>
          {tracks.length > 0 && <SectionRow title="Músicas" tracks={tracks} />}

          {artists.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold mb-4">Artistas</h2>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar">
                {artists.map((artist) => (
                  <a
                    key={artist.id}
                    href={`/artists/${artist.id}`}
                    className="flex flex-col items-center gap-2 w-24 flex-shrink-0 group"
                  >
                    <div className="w-[96px] h-[96px] rounded-full overflow-hidden border-2 transition-colors duration-200 group-hover:border-transparent"
                      style={{ borderColor: 'var(--bg-elevated)' }}>
                      <img
                        src={artist.image || '/placeholder.svg'}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-sm font-semibold text-center truncate w-full">{artist.name}</p>
                    {artist.followers > 0 && (
                      <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                        {(artist.followers / 1000).toFixed(0)}K fãs
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}

          {albums.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold mb-4">Álbuns</h2>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar">
                {albums.map((album) => (
                  <a
                    key={album.id}
                    href={`/albums/${album.id}`}
                    className="flex-shrink-0 w-40 p-3 rounded-xl transition-colors hover:bg-white/5 group relative"
                  >
                    <div className="relative mb-2">
                      <img
                        src={album.image || '/placeholder.svg'}
                        alt={album.name}
                        className="w-full aspect-square rounded-lg object-cover shadow-md"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-sm font-medium truncate">{album.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{album.artist_name}</p>
                    {album.release_date && (
                      <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>{album.release_date.slice(0, 4)}</p>
                    )}
                  </a>
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

  useEffect(() => {
    async function fetchHome() {
      try {
        const [trendingRes, genresRes, artistsRes] = await Promise.all([
          fetch('/api/deezer?endpoint=featured&limit=12'),
          fetch('/api/deezer?endpoint=genres'),
          fetch('/api/deezer?endpoint=charts/artists&limit=12'),
        ])
        if (trendingRes.ok) {
          const data = await trendingRes.json()
          setTrending(data.results ?? [])
        }
        if (genresRes.ok) {
          const data = await genresRes.json()
          const all = data.results ?? []
          setGenres(all.filter((g: Genre) => g.name && g.image && !g.name.includes('undefined')).slice(0, 20))
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

  const hasMore = loadedGenres.size < GENRE_NAMES.length

  const loadMore = useCallback(async () => {
    if (moreLoading || !hasMore) return
    setMoreLoading(true)
    const available = GENRE_NAMES.map((_, i) => i).filter((i) => !loadedGenres.has(i))
    if (available.length === 0) { setMoreLoading(false); return }
    const idx = available[Math.floor(Math.random() * available.length)]
    const genre = GENRE_NAMES[idx]
    try {
      const res = await fetch(`/api/deezer?endpoint=search&q=${encodeURIComponent(genre)}&type=track&limit=12`)
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
    return (
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
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Bem-vindo ao Ember Music</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Descubra música com Deezer</p>
      </div>

      {trending.length > 0 && (
        <SectionRow title="Em alta" tracks={trending} />
      )}

      {genres.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Gêneros musicais</h2>
          <Carousel>
            {genres.map((genre) => (
              <a
                key={genre.id}
                href={`/buscar?q=${encodeURIComponent(genre.name)}`}
                className="w-32 flex-shrink-0 p-2 rounded-xl text-center transition-transform hover:scale-105"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <img src={genre.image} alt={genre.name} className="w-full aspect-square rounded-lg object-cover mb-2" loading="lazy" />
                <p className="text-xs font-semibold truncate">{genre.name}</p>
              </a>
            ))}
          </Carousel>
        </section>
      )}

      {artists.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Artistas do momento</h2>
          <Carousel>
            {artists.map((artist) => (
              <div key={artist.id} className="w-36 flex-shrink-0 p-3 rounded-xl text-center transition-colors hover:bg-white/5 flex flex-col items-center">
                <a href={`/artists/${artist.id}`} className="w-full flex flex-col items-center">
                  <img src={artist.image || '/placeholder.svg'} alt={artist.name} className="w-full aspect-square rounded-full object-cover mb-3" loading="lazy" />
                  <p className="text-sm font-semibold truncate mb-3">{artist.name}</p>
                </a>
                <FollowButton artistId={artist.id} artistData={{ id: artist.id, name: artist.name, image: artist.image }} />
              </div>
            ))}
          </Carousel>
        </section>
      )}

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
      <div className="flex items-center gap-3 py-10">
        <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
        <span style={{ color: 'var(--text-secondary)' }}>Carregando...</span>
      </div>
    }>
      <HomePageInner />
    </Suspense>
  )
}
