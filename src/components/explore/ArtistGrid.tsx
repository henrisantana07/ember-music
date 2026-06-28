'use client'

import type { Artist } from '@/types/music'
import { FollowButton } from '@/components/FollowButton'
import { ArtistCircleSkeleton } from './skeletons/ArtistCircleSkeleton'

interface ArtistGridProps {
  artists: Artist[]
  loading?: boolean
}

export function ArtistGrid({ artists, loading }: ArtistGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => <ArtistCircleSkeleton key={i} />)}
      </div>
    )
  }

  if (artists.length === 0) return null

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
      {artists.map((artist) => (
        <a
          key={artist.id}
          href={`/artists/${artist.id}`}
          className="flex flex-col items-center gap-2 p-3 rounded-xl transition-colors hover:bg-white/5 group relative"
        >
          <div className="relative w-[120px] h-[120px] rounded-full p-[2px]" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
            />
            <img
              src={artist.image || '/placeholder.svg'}
              alt={artist.name}
              className="relative w-full h-full rounded-full object-cover z-10"
              loading="lazy"
            />
          </div>
          <p className="text-sm font-semibold text-center truncate w-full">{artist.name}</p>
          <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
            {artist.followers > 0 ? `${(artist.followers / 1000).toFixed(0)}K fãs` : ''}
          </p>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1">
            <FollowButton
              artistId={artist.id}
              artistData={{ id: artist.id, name: artist.name, image: artist.image } as any}
            />
          </div>
        </a>
      ))}
    </div>
  )
}
