'use client'

import { useEffect, useState } from 'react'
import type { Track } from '@/types/music'
import { TrackCard } from '@/components/TrackCard'

interface ExploreNoResultsProps {
  query: string
  activeFilterCount: number
  onClearFilters: () => void
}

export function ExploreNoResults({ query, activeFilterCount, onClearFilters }: ExploreNoResultsProps) {
  const [trending, setTrending] = useState<Track[]>([])

  useEffect(() => {
    fetch('/api/spotify?endpoint=featured&limit=4')
      .then(res => res.json())
      .then(data => setTrending(data.results ?? []))
      .catch(() => setTrending([]))
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center py-12 text-center">
        <svg
          className="w-16 h-16 mb-4"
          style={{ color: 'var(--text-disabled)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10 6v3m0 3h.01" />
        </svg>
        <h2 className="text-xl font-bold mb-1">Nenhum resultado para &ldquo;{query}&rdquo;</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Verifique a ortografia ou tente termos mais gerais.
        </p>
        {activeFilterCount > 0 && (
          <div className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent-solid)' }}>
            Você tem {activeFilterCount} filtro(s) ativo(s) —{' '}
            <button onClick={onClearFilters} className="font-semibold underline">Limpar filtros</button>
          </div>
        )}
      </div>

      {trending.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4">Tendências enquanto isso</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {trending.map((track) => (
              <TrackCard key={track.id} track={track} tracks={trending} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
