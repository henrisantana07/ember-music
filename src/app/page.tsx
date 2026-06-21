'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SectionRow } from '@/components/SectionRow'
import { TrackCardSkeleton } from '@/components/Skeleton'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import { createClient } from '@/lib/supabase/client'
import type { JamendoTrack } from '@/types/jamendo'

const PAGE_SIZE = 10

function HomePageInner() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q')

  if (query) {
    return <SearchResults query={query} />
  }

  return <HomeContent />
}

function SearchResults({ query: q }: { query: string }) {
  const query = q
  const [jamendoResults, setJamendoResults] = useState<JamendoTrack[]>([])
  const [loadingJamendo, setLoadingJamendo] = useState(true)

  useEffect(() => {
    async function fetchJamendo() {
      if (!query.trim()) return
      setLoadingJamendo(true)
      try {
        const res = await fetch(`/api/jamendo?endpoint=tracks&search=${encodeURIComponent(query)}&limit=10&order=popularity_week`)
        if (!res.ok) return
        const data = await res.json()
        setJamendoResults(data.results ?? [])
      } catch {
      } finally {
        setLoadingJamendo(false)
      }
    }
    fetchJamendo()
  }, [query])

  const noResults = !loadingJamendo && jamendoResults.length === 0

  if (noResults) {
    return <p className="text-center py-10" style={{ color: 'var(--text-disabled)' }}>Nenhum resultado encontrado para &ldquo;{query}&rdquo;</p>
  }

  return (
    <>
      <p className="text-sm mb-6" style={{ color: 'var(--text-disabled)' }}>
        Resultados para &ldquo;{query}&rdquo;
      </p>

      {loadingJamendo ? (
        <div className="mb-8">
          <div className="w-36 h-5 rounded mb-3" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
          </div>
        </div>
      ) : jamendoResults.length > 0 && (
        <SectionRow title="Músicas" tracks={jamendoResults} />
      )}
    </>
  )
}

function HomeContent() {
  const [trending, setTrending] = useState<JamendoTrack[]>([])
  const [recent, setRecent] = useState<JamendoTrack[]>([])
  const [recommended, setRecommended] = useState<JamendoTrack[]>([])
  const [moreTracks, setMoreTracks] = useState<JamendoTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [moreOffset, setMoreOffset] = useState(PAGE_SIZE * 2)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        let favTags: string[] = []

        if (user) {
          const { data: favs } = await supabase
            .from('favorites')
            .select('track_data')
            .eq('user_id', user.id)
            .limit(5)

          if (favs?.length) {
            const allTags = favs
              .map((f) => {
                const td = f.track_data as Record<string, string[]> | null
                return td?.tags ?? []
              })
              .flat()
              .slice(0, 3)
            favTags = [...new Set(allTags as string[])]
          }
        }

        const [trendingRes, recentRes] = await Promise.all([
          fetch('/api/jamendo?endpoint=tracks&limit=10'),
          fetch('/api/jamendo?endpoint=tracks&limit=10&offset=10'),
        ])
        const trendingData = await trendingRes.json()
        const recentData = await recentRes.json()
        setTrending(trendingData.results ?? [])
        setRecent(recentData.results ?? [])

        if (favTags.length > 0) {
          const tag = favTags[Math.floor(Math.random() * favTags.length)]
          const recRes = await fetch(`/api/jamendo?endpoint=tracks&tags=${tag}&limit=10`)
          const recData = await recRes.json()
          setRecommended(recData.results ?? [])
        }
      } catch (err) {
        console.error('Failed to fetch tracks:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/jamendo?endpoint=tracks&limit=${PAGE_SIZE}&offset=${moreOffset}`)
      const data = await res.json()
      const tracks = data.results ?? []
      setMoreTracks((prev) => [...prev, ...tracks])
      setHasMore(tracks.length === PAGE_SIZE)
      setMoreOffset((prev) => prev + PAGE_SIZE)
    } catch (err) {
      console.error('Failed to load more tracks:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, moreOffset])

  const { sentinelRef } = useInfiniteScroll({ onLoadMore: loadMore, hasMore, loading: loadingMore })

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Bem-vindo ao Ember Music</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Descubra música independente do mundo todo</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div>
            <div className="w-48 h-5 rounded mb-3" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
            </div>
          </div>
          <div>
            <div className="w-48 h-5 rounded mb-3" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      ) : (
        <>
          {recommended.length > 0 && (
            <SectionRow title="Recomendados para você" tracks={recommended} />
          )}
          <SectionRow title="Em alta no Jamendo" tracks={trending} />
          <SectionRow title="Descobertas recentes" tracks={recent} />

          {moreTracks.length > 0 && (
            <SectionRow title="Continue explorando" tracks={moreTracks} />
          )}

          {hasMore && <div ref={sentinelRef} className="h-4" />}

          {loadingMore && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </>
      )}
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
