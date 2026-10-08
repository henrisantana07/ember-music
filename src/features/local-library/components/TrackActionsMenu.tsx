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
} from 'lucide-react'
import { useLocalPlayer } from '@/features/local-library/hooks/use-local-player'
import { useLocalLibrary } from '@/features/local-library/hooks/use-local-library'
import { useLibraryStore } from '@/features/local-library/stores/library-store'
import { usePlayerStore } from '@/lib/store'
import { localTrackToPlayerTrack } from '@/features/local-library/lib/local-audio'
import { deleteMusicFile } from '@/lib/database'
import { formatDuration } from '@/lib/spotify'
import { useUser } from '@/hooks/use-user'
import { useFavoritesSync, useFavoritesStore, useEnsureFavorites, useIsFavorite } from '@/lib/favorites-store'
import { PlaylistModal } from '@/components/PlaylistModal'
import { Modal } from '@/components/ui/Modal'
import { Snackbar } from '@/components/ui/Snackbar'
import type { Track } from '@/types/music'
import type { LocalMusicFile } from '@/features/local-library/types'

interface TrackActionsMenuProps {
  track: LocalMusicFile
  allTracks: LocalMusicFile[]
}

export function TrackActionsMenu({ track, allTracks }: TrackActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const { playTrack } = useLocalPlayer()
  const { folders } = useLocalLibrary()
  const { currentTrack, isPlaying, queue, addToQueue: storeAddToQueue, togglePlay } = usePlayerStore()
  const [copied, setCopied] = useState(false)
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [snack, setSnack] = useState<string | null>(null)

  const { user } = useUser()
  useFavoritesSync(user?.id)
  useEnsureFavorites([track.id])
  const isFavorite = useIsFavorite(track.id)
  const toggleFavorite = useFavoritesStore((s) => s.toggle)

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

  const handleToggleFavorite = async () => {
    setIsOpen(false)
    if (!user) {
      setSnack('Faça login para favoritar faixas')
      return
    }
    const playerTrack = await localTrackToPlayerTrack(track, folders)
    const added = await toggleFavorite(playerTrack as Track)
    setSnack(added ? `"${track.title}" adicionada aos favoritos` : `"${track.title}" removida dos favoritos`)
  }

  const handleAddToPlaylist = async () => {
    setIsOpen(false)
    const playerTrack = await localTrackToPlayerTrack(track, folders)
    setPlaylistTrack(playerTrack as Track)
  }

  const handleShowInfo = () => {
    setIsOpen(false)
    setInfoOpen(true)
  }

  const handleShowLocation = () => {
    navigator.clipboard.writeText(track.path)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setIsOpen(false)
  }

  const handleRemoveFromLibrary = () => {
    setIsOpen(false)
    setConfirmRemoveOpen(true)
  }

  const confirmRemove = async () => {
    setRemoving(true)
    try {
      await deleteMusicFile(track.id)
      useLibraryStore.getState().removeTrack(track.id)
      setSnack(`"${track.title}" removida da biblioteca`)
    } catch {
      setSnack('Não foi possível remover a faixa. Tente novamente.')
    } finally {
      setRemoving(false)
      setConfirmRemoveOpen(false)
    }
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
      label: isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
      icon: <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} style={isFavorite ? { color: 'var(--accent-solid)' } : undefined} />,
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

  const infoRows: Array<{ label: string; value: string }> = [
    { label: 'Título', value: track.title },
    { label: 'Artista', value: track.artist || '—' },
    { label: 'Álbum', value: track.album || '—' },
    { label: 'Artista do álbum', value: track.albumArtist || '—' },
    { label: 'Gênero', value: track.genre || '—' },
    { label: 'Ano', value: track.year ? String(track.year) : '—' },
    { label: 'Duração', value: track.duration > 0 ? formatDuration(Math.floor(track.duration)) : '—' },
    { label: 'Bitrate', value: track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : '—' },
    { label: 'Taxa de amostragem', value: track.sampleRate ? `${Math.round(track.sampleRate / 1000)} kHz` : '—' },
    { label: 'Tamanho', value: track.size ? `${(track.size / (1024 * 1024)).toFixed(1)} MB` : '—' },
    { label: 'Formato', value: track.extension?.toUpperCase() || '—' },
    { label: 'Pasta', value: folders.find((f) => f.id === track.folderId)?.name || '—' },
    { label: 'Arquivo', value: track.path },
  ]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }}
        className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors state-layer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title="Mais opções"
        aria-label={`Mais opções para ${track.title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-disabled)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[220px] rounded-[var(--shape-large)] shadow-elevation-2 border border-outline-variant animate-fade-in"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="px-4 py-2 border-b border-outline-variant text-label-medium font-medium uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
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
                  className={`w-full flex items-center gap-3 px-4 min-h-[48px] text-body-medium transition-colors state-layer ${item.primary ? 'font-semibold' : ''} ${item.danger ? 'text-red-400' : ''}`}
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

      {playlistTrack && (
        <PlaylistModal
          open
          onClose={() => setPlaylistTrack(null)}
          track={playlistTrack}
        />
      )}

      {infoOpen && (
        <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Informações da faixa">
          <dl className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {infoRows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-body-medium shrink-0" style={{ color: 'var(--text-secondary)' }}>{row.label}</dt>
                <dd className="text-body-medium text-right break-all" style={{ color: 'var(--text-primary)' }}>{row.value}</dd>
              </div>
            ))}
            {track.inferred && (
              <p className="text-body-medium pt-1" style={{ color: 'var(--text-disabled)' }}>
                Metadados inferidos do nome do arquivo.
              </p>
            )}
            {track.missing && (
              <p className="text-body-medium pt-1" style={{ color: 'var(--error)' }}>
                Arquivo não encontrado — reconecte a pasta.
              </p>
            )}
          </dl>
        </Modal>
      )}

      {confirmRemoveOpen && (
        <Modal open={confirmRemoveOpen} onClose={() => setConfirmRemoveOpen(false)} title="Remover da biblioteca">
          <p className="text-body-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
            Remover <strong style={{ color: 'var(--text-primary)' }}>{track.title}</strong> da biblioteca local? O arquivo no seu disco não será apagado.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmRemoveOpen(false)}
              className="min-h-[48px] px-5 text-label-large rounded-lg"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmRemove}
              disabled={removing}
              className="min-h-[48px] px-5 text-label-large rounded-lg disabled:opacity-50"
              style={{ backgroundColor: 'var(--error)', color: 'white' }}
            >
              {removing ? 'Removendo…' : 'Remover'}
            </button>
          </div>
        </Modal>
      )}

      <Snackbar
        open={snack !== null}
        message={snack ?? ''}
        onDismiss={() => setSnack(null)}
      />
    </div>
  )
}
