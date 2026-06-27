'use client'

import type { Album } from '@/types/music'

interface AlbumResultGridProps {
  albums: Album[]
  loading?: boolean
  maxItems?: number
}

export function AlbumResultGrid({ albums, loading, maxItems }: AlbumResultGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: maxItems ?? 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square rounded-lg skeleton" />
            <div className="h-4 w-3/4 rounded skeleton" />
            <div className="h-3 w-1/2 rounded skeleton" />
          </div>
        ))}
      </div>
    )
  }

  const displayAlbums = maxItems ? albums.slice(0, maxItems) : albums
  if (displayAlbums.length === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {displayAlbums.map((album) => (
        <a
          key={album.id}
          href={`/albums/${album.id}`}
          className="group p-2 rounded-xl transition-colors hover:bg-white/5"
        >
          <img
            src={album.image || '/placeholder.svg'}
            alt={album.name}
            className="w-full aspect-square rounded-lg object-cover mb-2"
            loading="lazy"
          />
          <p className="text-sm font-semibold truncate">{album.name}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{album.artist_name}</p>
          <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
            {album.release_date ? album.release_date.split('-')[0] : ''}
          </p>
        </a>
      ))}
    </div>
  )
}
