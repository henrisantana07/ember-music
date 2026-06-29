'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getGenreGradient } from '@/constants/genreColors'
import { GenreCardSkeleton } from './skeletons/GenreCardSkeleton'
import type { Genre } from '@/types/music'

export function GenreGrid() {
  const [genres, setGenres] = useState<Genre[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/spotify?endpoint=genres')
      .then(res => res.json())
      .then(data => setGenres((data.results ?? []).slice(0, 16)))
      .catch(() => setGenres([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section>
        <h2 className="text-lg font-bold mb-4">Explorar géneros</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <GenreCardSkeleton key={i} />)}
        </div>
      </section>
    )
  }

  if (genres.length === 0) return null

  return (
    <section>
      <h2 className="text-lg font-bold mb-4">Explorar géneros</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {genres.map((genre) => {
          const gradient = getGenreGradient(genre.name)
          return (
            <button
              key={genre.id}
              onClick={() => router.push(`/buscar?genero=${encodeURIComponent(genre.name.toLowerCase())}&genreId=${genre.id}`)}
              className="relative rounded-xl overflow-hidden border-0 text-left group"
              style={{ aspectRatio: '1.6 / 1', background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
            >
              <div className="absolute inset-0 transition-all duration-200 group-hover:bg-black/20 group-hover:scale-105" />
              <span
                className="absolute bottom-3 left-3 text-lg font-bold"
                style={{ color: '#F5F1ED', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
              >
                {genre.name}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
