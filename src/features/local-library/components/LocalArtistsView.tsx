'use client'

import { useLocalPlayer } from '@/features/local-library/hooks/use-local-player'
import { useLocalLibrary } from '@/features/local-library/hooks/use-local-library'
import type { LocalMusicFile } from '@/features/local-library/types'

interface LocalArtistsViewProps {
  filter?: 'all' | 'tracks' | 'albums' | 'artists' | 'folders'
}

export function LocalArtistsView({ filter = 'all' }: LocalArtistsViewProps) {
  const { getArtists, getTracksByArtist } = useLocalLibrary()
  const { playArtist } = useLocalPlayer()
  const artists = getArtists()

  if (artists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhum artista encontrado</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {artists.map((artist) => (
        <div
          key={artist.name}
          className="card-hover group p-4 cursor-pointer flex flex-col items-center text-center"
          onClick={() => playArtist(artist.name)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && playArtist(artist.name)}
        >
          <div className="relative w-full aspect-square mb-3 rounded-full overflow-hidden">
            {artist.albums.size > 0 && (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}>
                <span className="text-2xl font-bold" style={{ color: 'var(--bg-base)' }}>
                  {artist.name[0].toUpperCase()}
                </span>
              </div>
            )}
            <div
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
              style={{ background: 'var(--accent-overlay)' }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-150 group-hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
          <p className="font-semibold text-sm truncate w-full">{artist.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {artist.trackCount} {artist.trackCount === 1 ? 'música' : 'músicas'} · {artist.albums.size} {artist.albums.size === 1 ? 'álbum' : 'álbuns'}
          </p>
        </div>
      ))}
    </div>
  )
}