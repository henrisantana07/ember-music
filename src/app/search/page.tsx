'use client'

import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { TrackCard } from '@/components/TrackCard'
import { YouTubeResult } from '@/components/YouTubeResult'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import type { JamendoTrack } from '@/types/jamendo'

interface YouTubeItem {
  videoId: string
  title: string
  channelTitle: string
  description: string
  thumbnails: Record<string, { url: string; width: number; height: number }>
  publishedAt: string
}

const GENRES = [
  'rock', 'pop', 'jazz', 'electronic', 'hiphop', 'classical',
  'reggae', 'blues', 'metal', 'folk', 'ambient', 'soul', 'funk', 'indie',
]

const DURATION_OPTIONS = [
  { label: 'Qualquer', min: undefined, max: undefined },
  { label: 'Curta (< 3min)', min: 0, max: 180 },
  { label: 'Média (3-6min)', min: 180, max: 360 },
  { label: 'Longa (> 6min)', min: 360, max: undefined },
]

const PAGE_SIZE = 20

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryFromUrl = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(queryFromUrl)
  const [genre, setGenre] = useState('')
  const [durationIdx, setDurationIdx] = useState(0)
  const [year, setYear] = useState('')
  const [results, setResults] = useState<JamendoTrack[]>([])
  const [ytResults, setYtResults] = useState<YouTubeItem[]>([])
  const [ytAvailable, setYtAvailable] = useState(true)
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalResults, setTotalResults] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  function buildParams(q: string, g: string, dIdx: number, y: string, off: number) {
    const params = new URLSearchParams()
    params.set('endpoint', 'search')
    if (q) params.set('q', q)
    if (g) params.set('genre', g)
    const durOpt = DURATION_OPTIONS[dIdx]
    if (durOpt.min !== undefined) params.set('duration_min', String(durOpt.min))
    if (durOpt.max !== undefined) params.set('duration_max', String(durOpt.max))
    if (y) params.set('year', y)
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(off))
    return params
  }

  const doSearch = useCallback((q: string, g: string, dIdx: number, y: string, off: number, append = false) => {
    const trimmedQ = q.trim()
    setLoading(true)
    const params = buildParams(trimmedQ, g, dIdx, y, off)

    Promise.all([
      fetch(`/api/jamendo?${params.toString()}`).then((r) => r.json()),
      !append && trimmedQ ? fetch(`/api/youtube?q=${encodeURIComponent(trimmedQ)}&maxResults=6`).then((r) => {
        if (!r.ok) { setYtAvailable(false); return { results: [] } }
        setYtAvailable(true)
        return r.json()
      }).catch(() => { setYtAvailable(false); return { results: [] } }) : Promise.resolve({ results: [] }),
    ]).then(([jamendoData, ytData]) => {
      const tracks = jamendoData.results ?? []
      setResults((prev) => append ? [...prev, ...tracks] : tracks)
      setHasMore(tracks.length === PAGE_SIZE)
      setTotalResults(jamendoData.headers?.results_count ?? 0)
      if (!append && trimmedQ) {
        setYtResults(ytData.results ?? [])
      }
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (queryFromUrl) {
      setQuery(queryFromUrl)
      setOffset(0)
      doSearch(queryFromUrl, genre, durationIdx, year, 0, false)
    }
  }, [queryFromUrl])

  function startSearch(q: string, g: string, dIdx: number, y: string) {
    setOffset(0)
    doSearch(q, g, dIdx, y, 0, false)
  }

  const loadMore = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE
    setOffset(nextOffset)
    doSearch(query, genre, durationIdx, year, nextOffset, true)
  }, [offset, query, genre, durationIdx, year, doSearch])

  const { sentinelRef } = useInfiniteScroll({ onLoadMore: loadMore, hasMore, loading })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false })
      startSearch(trimmed, genre, durationIdx, year)
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        router.push(`/search?q=${encodeURIComponent(value.trim())}`, { scroll: false })
        startSearch(value.trim(), genre, durationIdx, year)
      }
    }, 400)
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    setYtResults([])
    setTotalResults(0)
    router.push('/search', { scroll: false })
  }

  const selectedDurStyle = {
    backgroundColor: 'var(--accent-muted)',
    color: 'var(--accent-solid)',
    borderColor: 'var(--accent-solid)',
  } as React.CSSProperties

  const hasAnyFilter = query || genre || durationIdx > 0 || year

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
            placeholder="Buscar faixas, artistas, álbuns..."
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

      <div className="flex flex-wrap gap-2 mb-6">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => {
              const newGenre = g === genre ? '' : g
              setGenre(newGenre)
              setTimeout(() => startSearch(query, newGenre, durationIdx, year), 0)
            }}
            className="px-3 py-1.5 rounded-full text-sm border transition-colors"
            style={
              genre === g
                ? selectedDurStyle
                : { borderColor: 'var(--text-disabled)', color: 'var(--text-secondary)' }
            }
          >
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {DURATION_OPTIONS.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => {
              setDurationIdx(idx)
              setTimeout(() => startSearch(query, genre, idx, year), 0)
            }}
            className="px-3 py-1.5 rounded-full text-sm border transition-colors"
            style={
              durationIdx === idx
                ? selectedDurStyle
                : { borderColor: 'var(--text-disabled)', color: 'var(--text-secondary)' }
            }
          >
            {opt.label}
          </button>
        ))}
        <input
          type="number"
          placeholder="Ano"
          value={year}
          onChange={(e) => {
            setYear(e.target.value)
            setTimeout(() => startSearch(query, genre, durationIdx, e.target.value), 0)
          }}
          className="w-20 px-3 py-1.5 rounded-full text-sm border"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'var(--text-disabled)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {!hasAnyFilter ? (
        <p className="text-center py-10" style={{ color: 'var(--text-disabled)' }}>
          Digite algo ou selecione filtros para começar
        </p>
      ) : loading && results.length === 0 && ytResults.length === 0 ? (
        <div className="flex items-center gap-3 py-10">
          <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
          <span style={{ color: 'var(--text-secondary)' }}>Buscando...</span>
        </div>
      ) : results.length === 0 && ytResults.length === 0 ? (
        <p className="text-center py-10" style={{ color: 'var(--text-disabled)' }}>
          Nenhum resultado encontrado
        </p>
      ) : (
        <>
          {ytResults.length > 0 && !loading && (
            <YouTubeResult items={ytResults} query={query} />
          )}

          {ytAvailable === false && query && (
            <p className="text-xs mb-4" style={{ color: 'var(--text-disabled)' }}>
              YouTube indisponível — configure a chave da API do YouTube para ativar
            </p>
          )}

          {results.length > 0 && (
            <>
              <p className="text-sm mb-4" style={{ color: 'var(--text-disabled)' }}>
                {totalResults} {totalResults === 1 ? 'resultado' : 'resultados'} no Jamendo
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.map((track) => (
                  <TrackCard key={track.id} track={track} tracks={results} />
                ))}
              </div>
            </>
          )}
          {hasMore && <div ref={sentinelRef} className="h-10" />}
          {loading && results.length > 0 && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
            </div>
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
