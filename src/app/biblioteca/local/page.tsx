'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocalLibrary } from '@/features/local-library/hooks/use-local-library'
import { LocalLibraryHeader } from '@/features/local-library/components/LocalLibraryHeader'
import { LocalTrackList } from '@/features/local-library/components/LocalTrackList'
import { LocalTrackGrid } from '@/features/local-library/components/LocalTrackGrid'
import { LocalArtistsView } from '@/features/local-library/components/LocalArtistsView'
import { LocalAlbumsView } from '@/features/local-library/components/LocalAlbumsView'
import { LocalFoldersView } from '@/features/local-library/components/LocalFoldersView'

type TabId = 'tracks' | 'artists' | 'albums' | 'folders'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'tracks', label: 'Músicas', icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg> },
  { id: 'artists', label: 'Artistas', icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  { id: 'albums', label: 'Álbuns', icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
  { id: 'folders', label: 'Pastas', icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> },
]

function LocalLibraryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  const activeTab = (searchParams.get('tab') as TabId) || 'tracks'
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

  const totalTracks = tracks.length
  const totalArtists = new Set(tracks.map((t) => t.artist).filter(Boolean)).size
  const totalAlbums = new Set(tracks.map((t) => t.album).filter(Boolean)).size

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

      <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => router.push(`/biblioteca/local?tab=${tab.id}`)}
              className="tab-pill flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-150 whitespace-nowrap"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, var(--accent-from), var(--accent-to))'
                  : 'var(--bg-surface)',
                color: isActive ? 'var(--bg-base)' : 'var(--text-secondary)',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {isActive && activeTab === 'tracks' && (
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--accent-from)' }}>
                  {sortedTracks.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm" style={{ color: 'var(--text-disabled)' }}>
          {activeTab === 'tracks' && `${sortedTracks.length} ${sortedTracks.length === 1 ? 'música' : 'músicas'}`}
          {activeTab === 'artists' && `${totalArtists} ${totalArtists === 1 ? 'artista' : 'artistas'}`}
          {activeTab === 'albums' && `${totalAlbums} ${totalAlbums === 1 ? 'álbum' : 'álbuns'}`}
          {activeTab === 'folders' && `${folders.length} ${folders.length === 1 ? 'pasta' : 'pastas'}`}
        </span>

        {activeTab === 'tracks' && sortedTracks.length > 0 && (
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

      {sortedTracks.length === 0 && activeTab === 'tracks' && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhuma música encontrada</p>
          <p className="text-sm" style={{ color: 'var(--text-disabled)' }}>Adicione uma pasta com suas músicas para começar</p>
        </div>
      )}

      {activeTab === 'tracks' && sortedTracks.length > 0 && (
        <>
          {viewMode === 'list' ? (
            <LocalTrackList tracks={sortedTracks} />
          ) : (
            <LocalTrackGrid tracks={sortedTracks} />
          )}
        </>
      )}

      {activeTab === 'artists' && <LocalArtistsView />}
      {activeTab === 'albums' && <LocalAlbumsView />}
      {activeTab === 'folders' && <LocalFoldersView />}
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