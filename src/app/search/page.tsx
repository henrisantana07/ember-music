'use client'

import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { YouTubeResult } from '@/components/YouTubeResult'

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

const PAGE_SIZE = 20

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryFromUrl = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(queryFromUrl)
  const [results, setResults] = useState<YouTubeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const nextPageTokenRef = useRef<string | null>(null)
  const queryRef = useRef(query)
  const seenIds = useRef(new Set<string>())
  const loadingRef = useRef(false)

  queryRef.current = query

  const doSearch = useCallback(async (q: string, pageToken: string | null, append: boolean) => {
    const trimmedQ = q.trim()
    if (!trimmedQ) return

    setLoading(true)
    loadingRef.current = true
    setError(false)

    try {
      let url = `/api/youtube?q=${encodeURIComponent(trimmedQ)}&maxResults=${PAGE_SIZE}`
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
  }, [])

  useEffect(() => {
    if (queryFromUrl) {
      setQuery(queryFromUrl)
      nextPageTokenRef.current = null
      doSearch(queryFromUrl, null, false)
    }
  }, [queryFromUrl, doSearch])

  function startSearch(q: string) {
    nextPageTokenRef.current = null
    doSearch(q, null, false)
  }

  function loadMore() {
    if (!nextPageTokenRef.current || loadingRef.current) return
    doSearch(queryRef.current, nextPageTokenRef.current, true)
  }

  useEffect(() => {
    if (!hasMore || loading) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )
    const el = sentinelRef.current
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false })
      startSearch(trimmed)
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        router.push(`/search?q=${encodeURIComponent(value.trim())}`, { scroll: false })
        startSearch(value.trim())
      }
    }, 400)
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    seenIds.current.clear()
    nextPageTokenRef.current = null
    setHasMore(true)
    router.push('/search', { scroll: false })
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative max-w-xl">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-disabled)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar músicas no YouTube..."
            className="w-full pl-12 pr-12 py-3 rounded-xl text-base border-none focus:outline-none focus:ring-2 transition-all"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--accent-solid)',
            } as React.CSSProperties}
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-disabled)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {!query.trim() ? (
        <p className="text-center py-10" style={{ color: 'var(--text-disabled)' }}>
          Digite algo para buscar músicas no YouTube
        </p>
      ) : loading && results.length === 0 ? (
        <div className="flex items-center gap-3 py-10">
          <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
          <span style={{ color: 'var(--text-secondary)' }}>Buscando...</span>
        </div>
      ) : error ? (
        <p className="text-center py-10" style={{ color: 'var(--error)' }}>
          Erro ao buscar no YouTube. Verifique a chave da API.
        </p>
      ) : results.length === 0 ? (
        <p className="text-center py-10" style={{ color: 'var(--text-disabled)' }}>
          Nenhum resultado encontrado para &ldquo;{query}&rdquo;
        </p>
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: 'var(--text-disabled)' }}>
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'} carregados
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
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-3 py-10">
        <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
        <span style={{ color: 'var(--text-secondary)' }}>Carregando...</span>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
