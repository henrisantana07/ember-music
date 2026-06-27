'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type DurationFilter = '' | 'short' | 'medium' | 'long'

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: '', label: 'Duração' },
  { value: 'short', label: 'Curtas (até 2min)' },
  { value: 'medium', label: 'Médias (2-5min)' },
  { value: 'long', label: 'Longas (5min+)' },
]

interface ActiveFilter {
  key: string
  label: string
}

export function ExploreFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const artistFilter = searchParams.get('artist') ?? ''
  const genreFilter = searchParams.get('genre') ?? ''
  const durationFilter = (searchParams.get('duration') ?? '') as DurationFilter
  const yearFilter = searchParams.get('year') ?? ''

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`/buscar?${params.toString()}`)
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString())
    ;['artist', 'genre', 'duration', 'year'].forEach((k) => params.delete(k))
    router.replace(`/buscar?${params.toString()}`)
  }

  const activeFilters: ActiveFilter[] = []
  if (genreFilter) activeFilters.push({ key: 'genre', label: `Género: ${genreFilter}` })
  if (artistFilter) activeFilters.push({ key: 'artist', label: `Artista: ${artistFilter}` })
  if (durationFilter) activeFilters.push({ key: 'duration', label: DURATION_OPTIONS.find(o => o.value === durationFilter)?.label ?? durationFilter })
  if (yearFilter) activeFilters.push({ key: 'year', label: `Ano: ${yearFilter}` })

  const hasFilters = activeFilters.length > 0

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto hide-scrollbar">
        <select
          value={genreFilter}
          onChange={(e) => updateParam('genre', e.target.value)}
          className="rounded-full px-3 py-1.5 text-xs font-semibold border transition-all"
          style={{
            backgroundColor: genreFilter ? 'var(--accent-muted)' : 'var(--bg-surface)',
            borderColor: genreFilter ? 'var(--accent-solid)' : 'var(--bg-elevated)',
            color: genreFilter ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          <option value="">Género</option>
        </select>
        <input
          value={artistFilter}
          onChange={(e) => updateParam('artist', e.target.value)}
          placeholder="Artista"
          className="rounded-full px-3 py-1.5 text-xs font-semibold border"
          style={{
            backgroundColor: artistFilter ? 'var(--accent-muted)' : 'var(--bg-surface)',
            borderColor: artistFilter ? 'var(--accent-solid)' : 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            maxWidth: 120,
          }}
        />
        <select
          value={durationFilter}
          onChange={(e) => updateParam('duration', e.target.value)}
          className="rounded-full px-3 py-1.5 text-xs font-semibold border transition-all"
          style={{
            backgroundColor: durationFilter ? 'var(--accent-muted)' : 'var(--bg-surface)',
            borderColor: durationFilter ? 'var(--accent-solid)' : 'var(--bg-elevated)',
            color: durationFilter ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          value={yearFilter}
          onChange={(e) => updateParam('year', e.target.value)}
          placeholder="Ano"
          className="rounded-full px-3 py-1.5 text-xs font-semibold border"
          style={{
            backgroundColor: yearFilter ? 'var(--accent-muted)' : 'var(--bg-surface)',
            borderColor: yearFilter ? 'var(--accent-solid)' : 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            maxWidth: 80,
          }}
        />
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs font-semibold px-3 py-1.5" style={{ color: 'var(--accent-solid)' }}>
            ✕ Limpar filtros
          </button>
        )}
      </div>
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => updateParam(f.key, '')}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent-solid)' }}
            >
              {f.label}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
