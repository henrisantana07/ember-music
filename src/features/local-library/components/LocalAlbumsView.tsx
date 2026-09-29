'use client'

import { useLocalPlayer } from '@/features/local-library/hooks/use-local-player'
import { useLocalLibrary } from '@/features/local-library/hooks/use-local-library'
import { Play } from 'lucide-react'

interface LocalAlbumsViewProps {
  filter?: 'all' | 'tracks' | 'albums' | 'artists' | 'folders'
}

export function LocalAlbumsView({ filter = 'all' }: LocalAlbumsViewProps) {
  const { getAlbums, getTracksByAlbum } = useLocalLibrary()
  const { playAlbum } = useLocalPlayer()
  const albums = getAlbums()

  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhum álbum encontrado</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {albums.map((album) => (
        <div
          key={`${album.name}|${album.artist}`}
          className="card-hover group p-3 cursor-pointer"
          onClick={() => playAlbum(album.name, album.artist)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && playAlbum(album.name, album.artist)}
        >
          <div className="relative mb-3 aspect-square">
            {album.artwork ? (
              <img
                src={album.artwork}
                alt={album.name}
                className="w-full h-full rounded-md object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--text-disabled)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            )}
            <div
              className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
              style={{ background: 'var(--accent-overlay)' }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-150 group-hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}>
                <Play className="w-5 h-5" style={{ color: 'var(--bg-base)' }} />
              </div>
            </div>
          </div>
          <h3 className="font-semibold text-sm truncate">{album.name}</h3>
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {album.artist}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-disabled)' }}>
            {album.trackCount} {album.trackCount === 1 ? 'faixa' : 'faixas'} · {album.year || 'Ano desconhecido'}
          </p>
        </div>
      ))}
    </div>
  )
}