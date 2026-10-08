'use client'

import { useRef, useEffect, useState } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  Heart,
  Plus,
  Info,
  Copy,
  Trash2,
  ExternalLink,
  Music,
  FileText,
  FolderOpen,
} from 'lucide-react'
import { useLocalPlayer } from '@/features/local-library/hooks/use-local-player'
import { useLocalLibrary } from '@/features/local-library/hooks/use-local-library'
import { usePlayerStore } from '@/lib/store'
import { localTrackToPlayerTrack } from '@/features/local-library/lib/local-audio'
import { formatDuration } from '@/lib/spotify'
import type { LocalMusicFile } from '@/features/local-library/types'

interface TrackActionsMenuProps {
  track: LocalMusicFile
  allTracks: LocalMusicFile[]
}

export function TrackActionsMenu({ track, allTracks }: TrackActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const { playTrack, next: playNextTrack } = useLocalPlayer()
  const { folders } = useLocalLibrary()
  const { currentTrack, isPlaying, queue, addToQueue: storeAddToQueue, togglePlay } = usePlayerStore()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePlay = () => {
    const isActive = currentTrack?.id === track.id
    if (isActive) {
      togglePlay()
    } else {
      playTrack(track, allTracks)
    }
    setIsOpen(false)
  }

  const handlePlayNext = async () => {
    // Add to queue right after current track
    const playerTrack = await localTrackToPlayerTrack(track, folders)
    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id)
    if (currentIndex >= 0) {
      const newQueue = [...queue]
      newQueue.splice(currentIndex + 1, 0, playerTrack)
      usePlayerStore.setState({ queue: newQueue, originalQueue: [...newQueue] })
    } else {
      storeAddToQueue(playerTrack)
    }
    setIsOpen(false)
  }

  const handleAddToQueue = async () => {
    const playerTrack = await localTrackToPlayerTrack(track, folders)
    storeAddToQueue(playerTrack)
    setIsOpen(false)
  }

  const handleToggleFavorite = () => {
    setIsOpen(false)
  }

  const handleAddToPlaylist = () => {
    setIsOpen(false)
  }

  const handleShowInfo = () => {
    setIsOpen(false)
  }

  const handleShowLocation = () => {
    navigator.clipboard.writeText(track.path)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setIsOpen(false)
  }

  const handleRemoveFromLibrary = () => {
    setIsOpen(false)
  }

  const menuItems = [
    {
      label: currentTrack?.id === track.id && isPlaying ? 'Pausar' : 'Reproduzir',
      icon: currentTrack?.id === track.id && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />,
      action: handlePlay,
      primary: true,
    },
    {
      label: 'Reproduzir em seguida',
      icon: <SkipForward className="w-4 h-4" />,
      action: handlePlayNext,
    },
    {
      label: 'Adicionar à fila',
      icon: <Plus className="w-4 h-4" />,
      action: handleAddToQueue,
    },
    { divider: true },
    {
      label: 'Adicionar aos favoritos',
      icon: <Heart className="w-4 h-4" />,
      action: handleToggleFavorite,
    },
    {
      label: 'Adicionar à playlist',
      icon: <Music className="w-4 h-4" />,
      action: handleAddToPlaylist,
    },
    { divider: true },
    {
      label: 'Informações',
      icon: <Info className="w-4 h-4" />,
      action: handleShowInfo,
    },
    {
      label: copied ? 'Caminho copiado!' : 'Copiar localização',
      icon: copied ? <Copy className="w-4 h-4" style={{ color: 'var(--success)' }} /> : <ExternalLink className="w-4 h-4" />,
      action: handleShowLocation,
    },
    { divider: true },
    {
      label: 'Remover da biblioteca',
      icon: <Trash2 className="w-4 h-4" />,
      action: handleRemoveFromLibrary,
      danger: true,
    },
  ]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }}
        className="p-1 rounded-full transition-colors state-layer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title="Mais opções"
        aria-label={`Mais opções para ${track.title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-disabled)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg shadow-xl border border-outline-variant animate-fade-in"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="px-2 py-1 border-b border-outline-variant text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
            {track.title}
          </div>
          <div className="py-1">
            {menuItems.map((item, index) => {
              if (item.divider) {
                return <div key={`divider-${index}`} className="border-t border-outline-variant my-1" />
              }
              return (
                <button
                  key={index}
                  onClick={item.action}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${item.primary ? 'font-medium' : ''} ${item.danger ? 'text-red-400' : ''}`}
                  style={{
                    color: item.danger ? 'var(--error)' : item.primary ? 'var(--accent-from)' : 'var(--text-primary)',
                    backgroundColor: 'transparent',
                  }}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}