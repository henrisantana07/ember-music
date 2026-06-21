'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { TrackCard } from '@/components/TrackCard'
import type { JamendoTrack } from '@/types/jamendo'

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

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryFromUrl = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(queryFromUrl)
  const [genre, setGenre] = useState('')
  const [durationIdx, setDurationIdx] = useState(0)
  const [year, setYear] = useState('')
  const [results, setResults] = useState<JamendoTrack[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (queryFromUrl) {
      setQuery(queryFromUrl)
      doSearch(queryFromUrl, genre, durationIdx, year)
    }
  }, [queryFromUrl])

  function doSearch(q: string, g: string, dIdx: number, y: string) {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('endpoint', 'search')
    if (q) params.set('q', q)
    if (g) params.set('genre', g)
    const durOpt = DURATION_OPTIONS[dIdx]
    if (durOpt.min !== undefined) params.set('duration_min', String(durOpt.min))
    if (durOpt.max !== undefined) params.set('duration_max', String(durOpt.max))
    if (y) params.set('year', y)

    fetch(`/api/jamendo?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setResults(data.results ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/search?q=${encodeURIComponent(query)}`, { scroll: false })
    doSearch(query, genre, durationIdx, year)
  }

  const selectedDurStyle = {
    backgroundColor: 'var(--accent-muted)',
    color: 'var(--accent-solid)',
    borderColor: 'var(--accent-solid)',
  } as React.CSSProperties

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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar faixas ou artistas..."
            className="w-full pl-12 pr-4 py-3 rounded-xl text-base border-none focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--accent-solid)',
            } as React.CSSProperties}
          />
        </div>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => {
              setGenre(g === genre ? '' : g)
              setTimeout(() => doSearch(query, g === genre ? '' : g, durationIdx, year), 0)
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
              setTimeout(() => doSearch(query, genre, idx, year), 0)
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
            setTimeout(() => doSearch(query, genre, durationIdx, e.target.value), 0)
          }}
          className="w-20 px-3 py-1.5 rounded-full text-sm border"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'var(--text-disabled)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-10">
          <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
          <span style={{ color: 'var(--text-secondary)' }}>Buscando...</span>
        </div>
      ) : results.length === 0 ? (
        <p className="text-center py-10" style={{ color: 'var(--text-disabled)' }}>
          {query || genre || durationIdx > 0 || year
            ? 'Nenhum resultado encontrado'
            : 'Digite algo para buscar'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.map((track) => (
            <TrackCard key={track.id} track={track} tracks={results} />
          ))}
        </div>
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
