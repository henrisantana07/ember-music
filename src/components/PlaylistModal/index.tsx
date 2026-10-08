'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlaylistsStore } from '@/lib/playlists-store'
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal'
import { Modal } from '@/components/ui/Modal'
import { updateTrackCoverIfNeeded } from '@/lib/playlist/updateTrackCover'
import type { Track } from '@/types/music'
import type { Json } from '@/types/database'

interface PlaylistModalProps {
  open: boolean
  onClose: () => void
  track: Track
}

export function PlaylistModal({ open, onClose, track }: PlaylistModalProps) {
  const { playlists, fetchPlaylists, updatePlaylist, updatePlaylistCover, loading } = usePlaylistsStore()
  const [containingIds, setContainingIds] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
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
    if (togglingId) return
    setTogglingId(playlistId)
    try {
    if (isIn) {
      const { error: deleteError } = await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', track.id)

      if (deleteError) return

      setContainingIds((prev) => {
        const next = new Set(prev)
        next.delete(playlistId)
        return next
      })

      const pl = playlists.find((p) => p.id === playlistId)
      updatePlaylist(playlistId, { track_count: Math.max(0, (pl?.track_count ?? 1) - 1) })

      try {
        const { count } = await supabase
          .from('playlist_tracks')
          .select('id', { count: 'exact', head: true })
          .eq('playlist_id', playlistId)

        const isCustom = pl?.cover_source === 'custom'

        if (!isCustom) {
          if (count && count > 0) {
            const { data: lastTrack } = await supabase
              .from('playlist_tracks')
              .select('track_data')
              .eq('playlist_id', playlistId)
              .order('added_at', { ascending: false })
              .limit(1)
              .single()

            const lastCover = lastTrack?.track_data
              ? (lastTrack.track_data as { image?: string })?.image ?? null
              : null

            await supabase
              .from('playlists')
              .update({
                cover_source: 'track',
                last_track_cover_url: lastCover,
              })
              .eq('id', playlistId)

            updatePlaylistCover(playlistId, {
              cover_source: 'track',
              last_track_cover_url: lastCover,
            })
          } else {
            await supabase
              .from('playlists')
              .update({
                cover_source: 'branded',
                last_track_cover_url: null,
              })
              .eq('id', playlistId)

            updatePlaylistCover(playlistId, {
              cover_source: 'branded',
              last_track_cover_url: null,
            })
          }
        }
      } catch {
        // Cover update falhou — faixa já foi removida da playlist, UI já consistente
      }
    } else {
      const { data: maxPos } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1)

      const nextPosition = (maxPos?.[0]?.position ?? -1) + 1

      const now = new Date().toISOString()
      const { error: insertError } = await supabase
        .from('playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: track.id,
          track_data: track as unknown as Json,
          position: nextPosition,
          added_at: now,
        })

      if (insertError) return

      setContainingIds((prev) => {
        const next = new Set(prev)
        next.add(playlistId)
        return next
      })

      const pl = playlists.find((p) => p.id === playlistId)
      updatePlaylist(playlistId, { track_count: (pl?.track_count ?? 0) + 1 })

      await updateTrackCoverIfNeeded(supabase as any, playlistId, track.image)
      updatePlaylistCover(playlistId, {
        cover_source: 'track',
        last_track_cover_url: track.image,
      })
    }
    } finally {
      setTogglingId(null)
    }
  }

  if (!open) return null

  return (
    <>
      <Modal open={open} onClose={onClose} title="Adicionar à playlist">
          <p className="text-sm truncate mb-3" style={{ color: 'var(--text-secondary)' }}>
            {track.name} — {track.artist_name}
          </p>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {loading && playlists.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-4" role="status">
                <span
                  className="w-4 h-4 rounded-full border-2 animate-spin"
                  style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }}
                  aria-hidden="true"
                />
                <p className="text-sm" style={{ color: 'var(--text-disabled)' }}>
                  Carregando playlists…
                </p>
              </div>
            )}

            {!loading && playlists.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--text-disabled)' }}>
                Nenhuma playlist ainda
              </p>
            )}

            {playlists.map((pl) => {
              const isIn = containingIds.has(pl.id)
              const isToggling = togglingId === pl.id
              return (
                <button
                  key={pl.id}
                  onClick={() => handleToggle(pl.id, isIn)}
                  disabled={isToggling}
                  aria-pressed={isIn}
                  aria-busy={isToggling}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-state-hover text-left state-layer disabled:opacity-60"
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors"
                    style={{
                      borderColor: isToggling ? 'var(--accent-from)' : isIn ? 'var(--accent-from)' : 'var(--outline)',
                      backgroundColor: isIn && !isToggling ? 'var(--accent-from)' : 'transparent',
                    }}
                    aria-hidden="true"
                  >
                    {isToggling ? (
                      <span
                        className="w-3 h-3 rounded-full border-2 animate-spin"
                        style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }}
                      />
                    ) : isIn && (
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mt-2 transition-colors hover:bg-state-hover state-layer"
            style={{ color: 'var(--accent-from)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Criar playlist
          </button>
      </Modal>

      <CreatePlaylistModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </>
  )
}
