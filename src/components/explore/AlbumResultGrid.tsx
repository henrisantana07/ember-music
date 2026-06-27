'use client'

import { useState } from 'react'
import type { Album } from '@/types/music'
import { AlbumPlaylistModal } from '@/components/AlbumPlaylistModal'

interface AlbumResultGridProps {
  albums: Album[]
  loading?: boolean
  maxItems?: number
}

export function AlbumResultGrid({ albums, loading, maxItems }: AlbumResultGridProps) {
  const [pickerAlbum, setPickerAlbum] = useState<Album | null>(null)

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
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {displayAlbums.map((album) => (
          <div key={album.id} className="group relative p-2 rounded-xl transition-colors hover:bg-white/5">
            <a href={`/albums/${album.id}`} className="block">
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
            <button
              onClick={(e) => { e.preventDefault(); setPickerAlbum(album) }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
              title="Adicionar à playlist"
            >
              <svg className="w-4 h-4" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      {pickerAlbum && (
        <AlbumPlaylistModal
          open
          onClose={() => setPickerAlbum(null)}
          album={pickerAlbum}
        />
      )}
    </>
  )
}
