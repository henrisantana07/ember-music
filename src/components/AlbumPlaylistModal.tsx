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
  const [adding, setAdding] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    fetchPlaylists()
    setLoading(true)
    fetch(`/api/spotify?endpoint=albums&id=${album.id}`)
      .then(res => res.json())
      .then(data => setTracks(data.tracks ?? []))
      .catch(() => setTracks([]))
      .finally(() => setLoading(false))
  }, [open, album?.id])

  async function handleAddToPlaylist(playlistId: string) {
    setAdding(playlistId)
    try {
      const { data: maxPos } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1)

      let nextPosition = (maxPos?.[0]?.position ?? -1) + 1
      const now = new Date().toISOString()

      const inserts = tracks.map(track => ({
        playlist_id: playlistId,
        track_id: track.id,
        track_data: track as unknown as Json,
        position: nextPosition++,
        added_at: now,
      }))

      const { error } = await supabase.from('playlist_tracks').insert(inserts)
      if (error) throw error

      if (tracks.length > 0) {
        await updateTrackCoverIfNeeded(supabase as any, playlistId, tracks[0].image)
        updatePlaylistCover(playlistId, {
          cover_source: 'track',
          last_track_cover_url: tracks[0].image,
        })
      }

      onClose()
    } catch (err) {
      console.error('Erro ao adicionar álbum à playlist:', err)
    } finally {
      setAdding(null)
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

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {playlists.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--text-disabled)' }}>
                Nenhuma playlist ainda
              </p>
            )}
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAddToPlaylist(pl.id)}
                disabled={adding === pl.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5 text-left disabled:opacity-50"
              >
                <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-from)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="flex-1 truncate">{pl.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                  {adding === pl.id ? 'A adicionar...' : `${pl.track_count} faixas`}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mt-2 transition-colors hover:bg-white/5"
            style={{ color: 'var(--accent-from)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Criar playlist
          </button>
        </div>
      </div>

      <CreatePlaylistModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </>
  )
}
