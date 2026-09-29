'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Folder, Music, ChevronLeft, Search } from 'lucide-react'
import { useLocalLibrary } from '@/features/local-library/hooks/use-local-library'
import { useLocalPlayer } from '@/features/local-library/hooks/use-local-player'
import { getDirectoryTreeByFolder, getDirectoryTreeByParent, getDirectoryNode } from '@/lib/database'
import type { DirectoryNode, LocalMusicFile } from '@/features/local-library/types'

interface FolderBrowserProps {
  folderId: string
  onBack?: () => void
}

export function FolderBrowser({ folderId, onBack }: FolderBrowserProps) {
  const { getTracksByFolder } = useLocalLibrary()
  const { playFolder, playTrack } = useLocalPlayer()
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [treeNodes, setTreeNodes] = useState<DirectoryNode[]>([])
  const [childNodes, setChildNodes] = useState<DirectoryNode[]>([])
  const [tracks, setTracks] = useState<LocalMusicFile[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadTree()
  }, [folderId])

  async function loadTree() {
    setLoading(true)
    try {
      const nodes = await getDirectoryTreeByFolder(folderId)
      setTreeNodes(nodes)
      const root = nodes.find(n => n.parentId === null)
      if (root) {
        setCurrentNodeId(root.id)
        await loadNode(root.id)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadNode(nodeId: string) {
    setLoading(true)
    try {
      const node = await getDirectoryNode(nodeId)
      if (!node) return

      setCurrentNodeId(nodeId)

      if (node.hasChildren) {
        const children = await getDirectoryTreeByParent(folderId, nodeId)
        setChildNodes(children)
      } else {
        setChildNodes([])
      }

      const nodeTracks = getTracksByFolder(folderId).filter(t => t.path.startsWith(node.path + '/') || (node.path === '' && !t.path.includes('/')))
      setTracks(nodeTracks)
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(nodeId: string) {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  function handlePlayTrack(track: LocalMusicFile) {
    playTrack(track, tracks)
  }

  function handlePlayAll() {
    playFolder(folderId)
  }

  const currentNode = treeNodes.find(n => n.id === currentNodeId)
  const breadcrumbs = currentNode ? getBreadcrumbs(currentNode) : []

  function getBreadcrumbs(node: DirectoryNode): DirectoryNode[] {
    const crumbs: DirectoryNode[] = []
    let current: DirectoryNode | undefined = node
    while (current) {
      crumbs.unshift(current)
      if (current.parentId) {
        const parentId: string = current.parentId
        const parent = treeNodes.find(n => n.id === parentId)
        if (!parent) break
        current = parent
      } else {
        break
      }
    }
    return crumbs
  }

  const filteredTracks = searchQuery
    ? tracks.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.album.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tracks

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-white/5 text-sm">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Voltar para pastas"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-disabled)' }} />}
            <span 
              className={`truncate ${i === breadcrumbs.length - 1 ? 'font-semibold' : ''}`}
              style={{ 
                color: i === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: i === breadcrumbs.length - 1 ? 'default' : 'pointer'
              }}
              onClick={() => i !== breadcrumbs.length - 1 && loadNode(crumb.id)}
            >
              {crumb.name}
            </span>
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-disabled)' }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar nesta pasta..."
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm border-none focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              boxShadow: '0 0 0 2px var(--accent-solid)',
            }}
          />
        </div>
      </div>

      {/* Subfolders */}
      {childNodes.length > 0 && (
        <div className="border-b border-white/5">
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
            Pastas ({childNodes.length})
          </div>
          <div className="divide-y divide-white/5">
            {childNodes.map((child) => (
              <button
                key={child.id}
                onClick={() => loadNode(child.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <Folder className="w-5 h-5" style={{ color: 'var(--accent-from)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{child.name}</span>
                    {expandedNodes.has(child.id) ? (
                      <ChevronDown className="w-4 h-4" style={{ color: 'var(--accent-from)' }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-disabled)' }} />
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {child.trackCount} {child.trackCount === 1 ? 'música' : 'músicas'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tracks */}
      <div className="flex-1 overflow-y-auto">
        {filteredTracks.length === 0 && childNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Music className="w-16 h-16" style={{ color: 'var(--text-disabled)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
              {childNodes.length > 0 ? 'Nenhuma música nesta pasta' : 'Pasta vazia'}
            </p>
          </div>
        ) : (
          <>
            {(filteredTracks.length > 0 || childNodes.length > 0) && (
              <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
                  Músicas ({filteredTracks.length})
                </span>
                {filteredTracks.length > 0 && (
                  <button
                    onClick={handlePlayAll}
                    className="btn-primary text-xs flex items-center gap-1"
                  >
                    <Music className="w-3 h-3" />
                    Tocar tudo
                  </button>
                )}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wider sticky top-0" style={{ color: 'var(--text-disabled)', backgroundColor: 'var(--bg-surface)' }}>
                    <th className="text-right pr-3 py-2 w-10">Nº</th>
                    <th className="pr-3 py-2 w-12" />
                    <th className="text-left py-2">Título</th>
                    <th className="text-left py-2 hidden sm:table-cell">Artista</th>
                    <th className="text-left py-2 hidden md:table-cell">Álbum</th>
                    <th className="text-right py-2 w-16">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTracks.map((track, index) => (
                    <tr
                      key={track.id}
                      className="group cursor-pointer transition-colors hover:bg-white/5"
                      onClick={() => handlePlayTrack(track)}
                    >
                      <td className="text-right pr-3 py-2 text-sm" style={{ color: 'var(--text-disabled)' }}>
                        <span className="group-hover:hidden">{index + 1}</span>
                        <span className="hidden group-hover:inline" style={{ color: 'var(--accent-solid)' }}>
                          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                      </td>
                      <td className="pr-3 py-2">
                        {track.artwork ? (
                          <img src={track.artwork} alt="" className="w-12 h-12 rounded-md object-cover" loading="lazy" />
                        ) : (
                          <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                            <Music className="w-6 h-6" style={{ color: 'var(--text-disabled)' }} />
                          </div>
                        )}
                      </td>
                      <td className="py-2 font-medium truncate max-w-[200px]">{track.title}</td>
                      <td className="py-2 truncate max-w-[150px] hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{track.artist}</td>
                      <td className="py-2 truncate max-w-[150px] hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>{track.album}</td>
                      <td className="text-right py-2" style={{ color: 'var(--text-disabled)' }}>
                        {track.duration > 0 ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}` : '--:--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}