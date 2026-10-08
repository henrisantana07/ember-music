'use client'

import { useEffect, useState, Suspense } from 'react'
import { FolderOpen, FolderClosed, ChevronRight, Music, Search } from 'lucide-react'
import { useLocalLibrary } from '@/features/local-library/hooks/use-local-library'
import { LocalLibraryHeader } from '@/features/local-library/components/LocalLibraryHeader'
import { LocalTrackList } from '@/features/local-library/components/LocalTrackList'
import { LocalTrackGrid } from '@/features/local-library/components/LocalTrackGrid'
import { ControlToolbar } from '@/components/ui/ControlToolbar'
import { SortMenu } from '@/components/ui/SortMenu'
import { SegmentedToggle } from '@/components/ui/SegmentedToggle'

function FolderTreeItem({
  folder,
  folders,
  selectedFolderId,
  onSelect,
  getTracksByFolder,
  level = 0,
}: {
  folder: { id: string; name: string; path: string }
  folders: { id: string; name: string; path: string }[]
  selectedFolderId: string | null
  onSelect: (folderId: string | null) => void
  getTracksByFolder: (folderId: string) => { id: string }[]
  level: number
}) {
  const isSelected = selectedFolderId === folder.id
  const folderTracks = getTracksByFolder(folder.id)
  const hasTracks = folderTracks.length > 0

  return (
    <div style={{ paddingLeft: `${level * 16 + 8}px` }}>
      <button
        onClick={() => onSelect(isSelected ? null : folder.id)}
        className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm transition-colors ${
          isSelected
            ? 'bg-[var(--accent-solid)] text-on-accent'
            : 'hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
        }`}
        style={{ color: isSelected ? 'var(--text-on-accent)' : 'var(--text-secondary)' }}
      >
        <FolderOpen className="w-4 h-4 flex-shrink-0" />
        <span className="truncate flex-1">{folder.name}</span>
        {hasTracks && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{
            backgroundColor: isSelected ? 'var(--outline)' : 'var(--bg-elevated)',
            color: isSelected ? 'white' : 'var(--text-disabled)'
          }}>
            {folderTracks.length}
          </span>
        )}
      </button>
    </div>
  )
}

function FolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  getTracksByFolder,
}: {
  folders: { id: string; name: string; path: string }[]
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  getTracksByFolder: (folderId: string) => { id: string }[]
}) {
  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 px-4">
        <FolderClosed className="w-12 h-12 mb-3" style={{ color: 'var(--text-disabled)' }} />
        <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
          Nenhuma pasta adicionada
        </p>
        <p className="text-xs text-center" style={{ color: 'var(--text-disabled)' }}>
          Use o botão "Adicionar pasta" acima
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => onSelectFolder(null)}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFolderId === null
              ? 'bg-[var(--accent-solid)] text-on-accent'
              : 'hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Todas as músicas</span>
        </button>
      </div>
      <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-disabled)' }}>
          Pastas
        </h3>
        {folders.map((folder) => (
          <FolderTreeItem
            key={folder.id}
            folder={folder}
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelect={onSelectFolder}
            getTracksByFolder={getTracksByFolder}
            level={0}
          />
        ))}
      </div>
    </div>
  )
}

function LocalLibraryContent() {
  const {
    getFilteredTracks,
    getTracksByFolder,
    scanning,
    scanProgress,
    folders,
    tracks,
    initialized,
    loading,
    viewMode,
    setViewMode,
  } = useLocalLibrary()

  const [trackSort, setTrackSort] = useState<'title' | 'artist' | 'album' | 'duration' | 'added'>('added')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const filteredTracks = getFilteredTracks()

  let tracksToShow = filteredTracks
  if (selectedFolderId) {
    tracksToShow = getTracksByFolder(selectedFolderId)
    if (trackSort === 'added') {
      tracksToShow = [...tracksToShow].sort((a, b) => b.createdAt - a.createdAt)
    }
  } else {
    tracksToShow = [...filteredTracks].sort((a, b) => {
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
  }

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full px-4 md:px-8" style={{ maxWidth: 1400 }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label={sidebarOpen ? 'Fechar painel de pastas' : 'Abrir painel de pastas'}
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          <LocalLibraryHeader />
        </div>
      </div>

      <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
        <aside
          className={`transition-all duration-300 ${
            sidebarOpen ? 'w-72 flex-shrink-0' : 'w-0 overflow-hidden'
          }`}
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRight: '1px solid var(--border)',
            borderRadius: '12px 0 0 12px',
          }}
        >
          <FolderSidebar
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            getTracksByFolder={getTracksByFolder}
          />
        </aside>

        <main className="flex-1 min-w-0">
          <div className="mb-4 space-y-3">
            <span className="text-body-small block" style={{ color: 'var(--text-disabled)' }} aria-live="polite">
              {tracksToShow.length} {tracksToShow.length === 1 ? 'música' : 'músicas'}
              {selectedFolderId && (
                <>
                  <span style={{ color: 'var(--text-disabled)' }}> em </span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {folders.find(f => f.id === selectedFolderId)?.name}
                  </span>
                </>
              )}
            </span>
            <ControlToolbar
              sort={
                <SortMenu
                  options={[
                    { value: 'added', label: 'Adicionadas recentemente' },
                    { value: 'title', label: 'Título (A → Z)' },
                    { value: 'artist', label: 'Artista (A → Z)' },
                    { value: 'album', label: 'Álbum (A → Z)' },
                    { value: 'duration', label: 'Duração' },
                  ]}
                  value={trackSort}
                  onChange={setTrackSort}
                />
              }
              view={
                <SegmentedToggle
                  ariaLabel="Modo de exibição"
                  size="sm"
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    {
                      value: 'list',
                      ariaLabel: 'Exibir como lista',
                      icon: (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      ),
                    },
                    {
                      value: 'grid',
                      ariaLabel: 'Exibir como grade',
                      icon: (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
                        </svg>
                      ),
                    },
                  ]}
                />
              }
            />
          </div>

          {tracksToShow.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
                {selectedFolderId ? 'Nenhuma música nesta pasta' : 'Nenhuma música encontrada'}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-disabled)' }}>
                {selectedFolderId
                  ? 'Esta pasta não contém arquivos de áudio suportados'
                  : 'Adicione uma pasta com suas músicas para começar'}
              </p>
            </div>
          )}

          {tracksToShow.length > 0 && (
            <>
              {viewMode === 'list' ? (
                <LocalTrackList tracks={tracksToShow} />
              ) : (
                <LocalTrackGrid tracks={tracksToShow} />
              )}
            </>
          )}
        </main>
      </div>
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