'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Track, Album, Artist } from '@/types/music'

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

interface ExploreFiltersProps {
  tracks: Track[]
  albums: Album[]
  artists: Artist[]
}

export function ExploreFilters({ tracks, albums, artists }: ExploreFiltersProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const artistFilter = searchParams.get('artist') ?? ''
  const genreFilter = searchParams.get('genre') ?? ''
  const durationFilter = (searchParams.get('duration') ?? '') as DurationFilter
  const [genreOptions, setGenreOptions] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/spotify?endpoint=genres')
      .then(res => res.json())
      .then(data => {
        const names: string[] = (data.results ?? []).map((g: { name: string }) => g.name)
        setGenreOptions(names)
      })
      .catch(() => setGenreOptions([]))
  }, [])

  const artistOptions = [...new Set([
    ...artists.map(a => a.name),
    ...tracks.map(t => t.artist_name),
  ])].filter(Boolean).sort()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`/buscar?${params.toString()}`)
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString())
    ;['artist', 'genre', 'duration'].forEach((k) => params.delete(k))
    router.replace(`/buscar?${params.toString()}`)
  }

  const activeFilters: ActiveFilter[] = []
  if (genreFilter) activeFilters.push({ key: 'genre', label: `Género: ${genreFilter}` })
  if (artistFilter) activeFilters.push({ key: 'artist', label: `Artista: ${artistFilter}` })
  if (durationFilter) activeFilters.push({ key: 'duration', label: DURATION_OPTIONS.find(o => o.value === durationFilter)?.label ?? durationFilter })

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
          {genreOptions.map((name) => (
            <option key={name} value={name.toLowerCase()}>{name}</option>
          ))}
        </select>
        <select
          value={artistFilter}
          onChange={(e) => updateParam('artist', e.target.value)}
          className="rounded-full px-3 py-1.5 text-xs font-semibold border transition-all"
          style={{
            backgroundColor: artistFilter ? 'var(--accent-muted)' : 'var(--bg-surface)',
            borderColor: artistFilter ? 'var(--accent-solid)' : 'var(--bg-elevated)',
            color: artistFilter ? 'var(--text-primary)' : 'var(--text-secondary)',
            maxWidth: 140,
          }}
        >
          <option value="">Artista</option>
          {artistOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
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
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs font-semibold px-3 py-1.5 whitespace-nowrap" style={{ color: 'var(--accent-solid)' }}>
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
