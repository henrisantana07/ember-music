'use client'

import { useLocalLibrary } from '@/features/local-library/hooks/use-local-library'
import { useLocalPlayer } from '@/features/local-library/hooks/use-local-player'
import { FolderOpen, Music, Trash2, RefreshCw, Folder, Link, AlertTriangle, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { FolderBrowser } from '@/features/local-library/components/FolderBrowser'

interface LocalFoldersViewProps {
  filter?: 'all' | 'tracks' | 'albums' | 'artists' | 'folders'
}

export function LocalFoldersView({ filter = 'all' }: LocalFoldersViewProps) {
  const { folders, removeFolder, updateFolder, startScan, reconnectFolder } = useLocalLibrary()
  const { playFolder } = useLocalPlayer()
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState<string | null>(null)

  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhuma pasta adicionada</p>
        <p className="text-sm" style={{ color: 'var(--text-disabled)' }}>Clique em "Adicionar pasta" para começar</p>
      </div>
    )
  }

  if (selectedFolder) {
    return (
      <FolderBrowser
        folderId={selectedFolder}
        onBack={() => setSelectedFolder(null)}
      />
    )
  }

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Nunca'
    return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="space-y-3">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="card-hover group flex items-center gap-4 p-4 cursor-pointer"
          onMouseEnter={() => setHoveredFolder(folder.id)}
          onMouseLeave={() => setHoveredFolder(null)}
          onClick={() => setSelectedFolder(folder.id)}
        >
          <div className="flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <FolderOpen className="w-7 h-7" style={{ color: 'var(--accent-from)' }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{folder.name}</h3>
              {folder.needsReconnect && (
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'var(--warning, #F59E0B)', color: 'var(--bg-base)' }}>
                  Requer reconexão
                </span>
              )}
              {!folder.handle && !folder.needsReconnect && (
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'var(--error)', color: 'white' }}>
                  Indisponível
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>{folder.trackCount} {folder.trackCount === 1 ? 'música' : 'músicas'}</span>
              <span>{folder.albumCount} {folder.albumCount === 1 ? 'álbum' : 'álbuns'}</span>
              <span>{folder.artistCount} {folder.artistCount === 1 ? 'artista' : 'artistas'}</span>
            </div>
            <p className="text-xs truncate mt-1" style={{ color: 'var(--text-disabled)' }}>
              Última verificação: {formatDate(folder.lastScan)}
            </p>
          </div>

          <div className={`flex items-center gap-2 opacity-0 transition-opacity ${hoveredFolder === folder.id ? 'opacity-100' : ''}`}>
            {folder.needsReconnect && (
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  setReconnecting(folder.id)
                  try {
                    await reconnectFolder(folder.id)
                  } finally {
                    setReconnecting(null)
                  }
                }}
                disabled={reconnecting === folder.id}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-from)' }}
                title="Reconectar pasta"
              >
                {reconnecting === folder.id ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); playFolder(folder.id) }}
              disabled={folder.needsReconnect}
              className="p-2 rounded-lg transition-colors opacity-50"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              title={folder.needsReconnect ? 'Reconecte a pasta primeiro' : 'Reproduzir pasta'}
            >
              <Music className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); startScan(folder.id) }}
              disabled={!folder.handle || folder.needsReconnect}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              title="Escanear pasta"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); removeFolder(folder.id) }}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--error)' }}
              title="Remover pasta da biblioteca"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}