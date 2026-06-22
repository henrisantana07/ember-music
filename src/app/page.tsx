'use client'

import { useEffect, useState, useRef, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { SectionRow } from '@/components/SectionRow'
import { TrackCardSkeleton } from '@/components/Skeleton'
import { FollowButton } from '@/components/FollowButton'
import type { Track, Artist, Genre } from '@/types/music'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchResults() {
      if (!query.trim()) return
      setLoading(true)
      try {
        const res = await fetch(`/api/spotify?endpoint=search&q=${encodeURIComponent(query)}&type=track&limit=20`)
        if (res.ok) {
          const data = await res.json()
          setTracks(data.tracks ?? [])
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    fetchResults()
  }, [query])

  if (!loading && tracks.length === 0) {
    return <p className="text-center py-10" style={{ color: 'var(--text-disabled)' }}>Nenhum resultado encontrado para &ldquo;{query}&rdquo;</p>
  }

  return (
    <>
      <p className="text-sm mb-6" style={{ color: 'var(--text-disabled)' }}>
        Resultados para &ldquo;{query}&rdquo;
      </p>

      {loading ? (
        <div className="mb-8">
          <div className="w-36 h-5 rounded mb-3" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
          </div>
        </div>
      ) : tracks.length > 0 && (
        <SectionRow title="Músicas" tracks={tracks} />
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
  const [page, setPage] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    async function fetchHome() {
      try {
        const [trendingRes, genresRes, artistsRes] = await Promise.all([
          fetch('/api/spotify?endpoint=featured&limit=12'),
          fetch('/api/spotify?endpoint=genres'),
          fetch('/api/spotify?endpoint=charts/artists&limit=12'),
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
      } catch {
      } finally {
        setInitialLoading(false)
      }
    }
    fetchHome()
  }, [])

  const loadMore = useCallback(async () => {
    if (moreLoading) return
    setMoreLoading(true)
    const nextPage = page + 1
    const genre = GENRE_NAMES[nextPage % GENRE_NAMES.length]
    try {
      const res = await fetch(`/api/spotify?endpoint=search&q=${encodeURIComponent(genre)}&type=track&limit=12`)
      if (res.ok) {
        const data = await res.json()
        const tracks = data.tracks ?? []
        setMoreTracks((prev) => [...prev, ...tracks])
        setPage(nextPage)
      }
    } catch {
    } finally {
      setMoreLoading(false)
    }
  }, [page, moreLoading])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

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
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
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
          </div>
        </section>
      )}

      {artists.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Artistas do momento</h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {artists.map((artist) => (
              <div key={artist.id} className="w-36 flex-shrink-0 p-3 rounded-xl text-center transition-colors hover:bg-white/5 flex flex-col items-center">
                <a href={`/artists/${artist.id}`} className="w-full flex flex-col items-center">
                  <img src={artist.image || '/placeholder.svg'} alt={artist.name} className="w-full aspect-square rounded-full object-cover mb-3" loading="lazy" />
                  <p className="text-sm font-semibold truncate mb-3">{artist.name}</p>
                </a>
                <FollowButton artistId={artist.id} artistData={{ id: artist.id, name: artist.name, image: artist.image }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {moreTracks.length > 0 && (
        <SectionRow title={`Descubra mais: ${GENRE_NAMES[page % GENRE_NAMES.length]}`} tracks={moreTracks} />
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
