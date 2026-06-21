'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlaylistsStore } from '@/lib/playlists-store'
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal'
import type { JamendoTrack } from '@/types/jamendo'
import type { Json } from '@/types/database'

interface PlaylistModalProps {
  open: boolean
  onClose: () => void
  track: JamendoTrack
}

export function PlaylistModal({ open, onClose, track }: PlaylistModalProps) {
  const { playlists, fetchPlaylists } = usePlaylistsStore()
  const [containingIds, setContainingIds] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    fetchPlaylists()
  }, [open])

  useEffect(() => {
    if (playlists.length === 0) {
      setContainingIds(new Set())
      return
    }
    supabase
      .from('playlist_tracks')
      .select('playlist_id')
      .in('playlist_id', playlists.map((p) => p.id))
      .eq('track_id', track.id)
      .then(({ data }) => {
        const ids = new Set((data ?? []).map((r) => r.playlist_id))
        setContainingIds(ids)
      })
  }, [playlists, track.id])

  async function handleToggle(playlistId: string, isIn: boolean) {
    if (isIn) {
      await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', track.id)

      setContainingIds((prev) => {
        const next = new Set(prev)
        next.delete(playlistId)
        return next
      })
    } else {
      const { data: maxPos } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1)

      const nextPosition = (maxPos?.[0]?.position ?? -1) + 1

      await supabase
        .from('playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: track.id,
          track_data: track as unknown as Json,
          position: nextPosition,
        })

      setContainingIds((prev) => {
        const next = new Set(prev)
        next.add(playlistId)
        return next
      })
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
            <h2 className="text-lg font-bold">Adicionar à playlist</h2>
            <button onClick={onClose} className="p-1" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm truncate mb-3" style={{ color: 'var(--text-secondary)' }}>
            {track.name} — {track.artist_name}
          </p>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {playlists.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--text-disabled)' }}>
                Nenhuma playlist ainda
              </p>
            )}

            {playlists.map((pl) => {
              const isIn = containingIds.has(pl.id)
              return (
                <button
                  key={pl.id}
                  onClick={() => handleToggle(pl.id, isIn)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5 text-left"
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors"
                    style={{
                      borderColor: isIn ? 'var(--accent-from)' : 'rgba(255,255,255,0.2)',
                      backgroundColor: isIn ? 'var(--accent-from)' : 'transparent',
                    }}
                  >
                    {isIn && (
                      <svg className="w-3 h-3" fill="white" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </div>
                  <span className="flex-1 truncate">{pl.name}</span>
                  {pl.collaborative && (
                    <span className="text-[10px] mr-1 px-1.5 py-0.5 rounded" style={{ color: 'var(--accent-from)', backgroundColor: 'var(--accent-muted)' }}>
                      Colab
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                    {pl.track_count}
                  </span>
                </button>
              )
            })}
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
