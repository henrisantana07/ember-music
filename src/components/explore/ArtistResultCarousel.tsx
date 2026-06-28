'use client'

import type { Artist } from '@/types/music'
import { ArtistCircleSkeleton } from './skeletons/ArtistCircleSkeleton'

interface ArtistResultCarouselProps {
  artists: Artist[]
  loading?: boolean
  maxItems?: number
}

export function ArtistResultCarousel({ artists, loading, maxItems }: ArtistResultCarouselProps) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
        {Array.from({ length: 6 }).map((_, i) => <ArtistCircleSkeleton key={i} />)}
      </div>
    )
  }

  const displayArtists = maxItems ? artists.slice(0, maxItems) : artists
  if (displayArtists.length === 0) return null

  return (
    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
      {displayArtists.map((artist) => (
        <a
          key={artist.id}
          href={`/artists/${artist.id}`}
          className="flex flex-col items-center gap-2 w-24 flex-shrink-0 group"
        >
          <div className="w-[96px] h-[96px] rounded-full overflow-hidden border-2 transition-colors duration-200 group-hover:border-transparent" style={{ borderColor: 'var(--bg-elevated)' }}>
            <img src={artist.image || '/placeholder.svg'} alt={artist.name} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <p className="text-sm font-semibold text-center truncate w-full">{artist.name}</p>
          <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
            {artist.followers > 0 ? `${(artist.followers / 1000).toFixed(0)}K fãs` : 'Artista'}
          </p>
        </a>
      ))}
    </div>
  )
}
