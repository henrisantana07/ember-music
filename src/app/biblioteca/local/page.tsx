'use client'

import { useEffect, useState, Suspense } from 'react'
import { useLocalLibrary } from '@/features/local-library/hooks/use-local-library'
import { LocalLibraryHeader } from '@/features/local-library/components/LocalLibraryHeader'
import { LocalTrackList } from '@/features/local-library/components/LocalTrackList'
import { LocalTrackGrid } from '@/features/local-library/components/LocalTrackGrid'

function LocalLibraryContent() {
  const {
    getFilteredTracks,
    scanning,
    scanProgress,
    folders,
    tracks,
    initialized,
    loading,
    viewMode,
  } = useLocalLibrary()

  const [trackSort, setTrackSort] = useState<'title' | 'artist' | 'album' | 'duration' | 'added'>('added')

  const filteredTracks = getFilteredTracks()

  const sortedTracks = [...filteredTracks].sort((a, b) => {
    switch (trackSort) {
      case 'title':
        return a.title.localeCompare(b.title)
      case 'artist':
        return a.artist.localeCompare(b.artist)
      case 'album':
        return a.album.localeCompare(b.album)
      case 'duration':
        return b.duration - a.duration
      case 'added':
      default:
        return b.createdAt - a.createdAt
    }
  })

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full px-4 md:px-8" style={{ maxWidth: 1400 }}>
      <LocalLibraryHeader />

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm" style={{ color: 'var(--text-disabled)' }}>
          {tracks.length} {tracks.length === 1 ? 'música' : 'músicas'}
        </span>

        {tracks.length > 0 && (
          <select
            value={trackSort}
            onChange={(e) => setTrackSort(e.target.value as typeof trackSort)}
            className="sort-select text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <option value="added">Adicionadas recentemente</option>
            <option value="title">Título (A → Z)</option>
            <option value="artist">Artista (A → Z)</option>
            <option value="album">Álbum (A → Z)</option>
            <option value="duration">Duração</option>
          </select>
        )}
      </div>

      {tracks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhuma música encontrada</p>
          <p className="text-sm" style={{ color: 'var(--text-disabled)' }}>Adicione uma pasta com suas músicas para começar</p>
        </div>
      )}

      {tracks.length > 0 && (
        <>
          {viewMode === 'list' ? (
            <LocalTrackList tracks={sortedTracks} />
          ) : (
            <LocalTrackGrid tracks={sortedTracks} />
          )}
        </>
      )}
    </div>
  )
}

export default function LocalLibraryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LocalLibraryContent />
    </Suspense>
  )
}