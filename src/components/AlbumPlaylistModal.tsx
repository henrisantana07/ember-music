'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlaylistsStore } from '@/lib/playlists-store'
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal'
import { updateTrackCoverIfNeeded } from '@/lib/playlist/updateTrackCover'
import type { Album, Track } from '@/types/music'
import type { Json } from '@/types/database'

interface AlbumPlaylistModalProps {
  open: boolean
  onClose: () => void
  album: Album
}

export function AlbumPlaylistModal({ open, onClose, album }: AlbumPlaylistModalProps) {
  const { playlists, fetchPlaylists, updatePlaylistCover } = usePlaylistsStore()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    setSelectedPlaylist(null)
    setAdding(false)
    fetchPlaylists()
    setLoading(true)
    fetch(`/api/spotify?endpoint=albums&id=${album.id}`)
      .then(res => res.json())
      .then(data => setTracks(data.tracks ?? []))
      .catch(() => setTracks([]))
      .finally(() => setLoading(false))
  }, [open, album?.id])

  async function handleConfirm() {
    if (!selectedPlaylist) return
    setAdding(true)
    try {
      const { data: maxPos } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', selectedPlaylist)
        .order('position', { ascending: false })
        .limit(1)

      let nextPosition = (maxPos?.[0]?.position ?? -1) + 1
      const now = new Date().toISOString()

      const inserts = tracks.map(track => ({
        playlist_id: selectedPlaylist,
        track_id: track.id,
        track_data: track as unknown as Json,
        position: nextPosition++,
        added_at: now,
      }))

      const { error } = await supabase.from('playlist_tracks').insert(inserts)
      if (error) throw error

      if (tracks.length > 0) {
        await updateTrackCoverIfNeeded(supabase as any, selectedPlaylist, tracks[0].image)
        updatePlaylistCover(selectedPlaylist, {
          cover_source: 'track',
          last_track_cover_url: tracks[0].image,
        })
      }

      onClose()
    } catch (err) {
      console.error('Erro ao adicionar álbum à playlist:', err)
    } finally {
      setAdding(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="w-full max-w-sm rounded-xl p-6 shadow-xl"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Adicionar álbum à playlist</h2>
            <button onClick={onClose} className="p-1" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <img src={album.image || '/placeholder.svg'} alt={album.name} className="w-12 h-12 rounded object-cover flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{album.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{album.artist_name}</p>
              <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                {loading ? 'A carregar...' : `${tracks.length} faixas`}
              </p>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
            Faixas do álbum
          </p>
          <div className="max-h-44 overflow-y-auto space-y-1 mb-4 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-solid)' }} />
              </div>
            ) : tracks.length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: 'var(--text-disabled)' }}>Nenhuma faixa encontrada</p>
            ) : (
              tracks.map((track, i) => (
                <div key={track.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md">
                  <span className="text-xs w-5 text-right flex-shrink-0" style={{ color: 'var(--text-disabled)' }}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate font-medium">{track.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{track.artist_name}</p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-disabled)' }}>
                    {track.duration ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}` : ''}
                  </span>
                </div>
              ))
            )}
          </div>

          <hr className="mb-3 border-0" style={{ height: 1, backgroundColor: 'var(--border-subtle)' }} />

          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
            Minhas playlists
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {playlists.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--text-disabled)' }}>
                Nenhuma playlist ainda
              </p>
            ) : (
              playlists.map((pl) => {
                const isSelected = selectedPlaylist === pl.id
                return (
                  <button
                    key={pl.id}
                    onClick={() => setSelectedPlaylist(isSelected ? null : pl.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-from)' : 'transparent',
                      color: isSelected ? '#fff' : 'inherit',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <span
                      className="w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors"
                      style={{
                        borderColor: isSelected ? '#fff' : 'var(--accent-from)',
                        backgroundColor: isSelected ? 'var(--accent-from)' : 'transparent',
                      }}
                    >
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    <span className="flex-1 truncate">{pl.name}</span>
                    <span className="text-xs" style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-disabled)' }}>
                      {pl.track_count} faixas
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5"
              style={{ color: 'var(--accent-from)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Criar playlist
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPlaylist || adding}
              className="flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
              style={{
                background: !selectedPlaylist ? 'var(--bg-surface)' : 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                color: !selectedPlaylist ? 'var(--text-disabled)' : '#fff',
              }}
            >
              {adding ? 'A adicionar...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>

      <CreatePlaylistModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </>
  )
}
