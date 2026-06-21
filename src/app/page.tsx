'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SectionRow } from '@/components/SectionRow'
import { YouTubeResult } from '@/components/YouTubeResult'
import { TrackCardSkeleton } from '@/components/Skeleton'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import { createClient } from '@/lib/supabase/client'
import type { JamendoTrack } from '@/types/jamendo'

interface YouTubeItem {
  videoId: string
  title: string
  channelTitle: string
  description: string
  thumbnails: Record<string, { url: string; width: number; height: number }>
  publishedAt: string
}

interface YouTubeResponse {
  results: YouTubeItem[]
  nextPageToken: string | null
  totalResults: number
}

const PAGE_SIZE = 10
const YT_PAGE_SIZE = 20

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
  const [results, setResults] = useState<YouTubeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const nextPageTokenRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const seenIds = useRef(new Set<string>())

  const doSearch = useCallback(async (pageToken: string | null, append: boolean) => {
    if (!query.trim()) return
    setLoading(true)
    loadingRef.current = true
    setError(false)

    try {
      let url = `/api/youtube?q=${encodeURIComponent(query)}&maxResults=${YT_PAGE_SIZE}`
      if (pageToken) url += `&pageToken=${pageToken}`

      const res = await fetch(url)
      if (!res.ok) { setError(true); return }

      const data: YouTubeResponse = await res.json()
      const items = data.results ?? []

      if (append) {
        const newItems = items.filter((item) => !seenIds.current.has(item.videoId))
        items.forEach((item) => seenIds.current.add(item.videoId))
        setResults((prev) => [...prev, ...newItems])
      } else {
        seenIds.current.clear()
        items.forEach((item) => seenIds.current.add(item.videoId))
        setResults(items)
      }

      nextPageTokenRef.current = data.nextPageToken
      setHasMore(!!data.nextPageToken)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [query])

  useEffect(() => {
    setResults([])
    nextPageTokenRef.current = null
    seenIds.current.clear()
    setHasMore(true)
    doSearch(null, false)
  }, [doSearch])

  function loadMore() {
    if (!nextPageTokenRef.current || loadingRef.current) return
    doSearch(nextPageTokenRef.current, true)
  }

  useEffect(() => {
    if (!hasMore || loading) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) loadMore()
      },
      { rootMargin: '200px' }
    )
    const el = sentinelRef.current
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading])

  if (error) {
    return <p className="text-center py-10" style={{ color: 'var(--error)' }}>Erro ao buscar no YouTube.</p>
  }

  if (loading && results.length === 0) {
    return (
      <div className="flex items-center gap-3 py-10">
        <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
        <span style={{ color: 'var(--text-secondary)' }}>Buscando...</span>
      </div>
    )
  }

  if (results.length === 0 && !loading) {
    return <p className="text-center py-10" style={{ color: 'var(--text-disabled)' }}>Nenhum resultado encontrado para &ldquo;{query}&rdquo;</p>
  }

  return (
    <>
      <p className="text-sm mb-4" style={{ color: 'var(--text-disabled)' }}>
        {results.length} {results.length === 1 ? 'resultado' : 'resultados'} para &ldquo;{query}&rdquo;
      </p>
      <YouTubeResult items={results} query={query} />
      {hasMore && <div ref={sentinelRef} className="h-10" />}
      {loading && results.length > 0 && (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!hasMore && results.length > 0 && (
        <p className="text-center py-6 text-sm" style={{ color: 'var(--text-disabled)' }}>
          Todos os resultados foram carregados
        </p>
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
