'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePlayerStore } from '@/lib/store'
import { usePlaylistsStore } from '@/lib/playlists-store'
import { formatDuration } from '@/lib/jamendo'
import type { JamendoTrack } from '@/types/jamendo'
import type { Database } from '@/types/database'

type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row']

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { play } = usePlayerStore()
  const { updatePlaylist, removePlaylist } = usePlaylistsStore()

  const [playlist, setPlaylist] = useState<Database['public']['Tables']['playlists']['Row'] | null>(null)
  const [tracks, setTracks] = useState<PlaylistTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  async function load() {
    setLoading(true)
    const { data: pl, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !pl) {
      router.push('/')
      return
    }

    setPlaylist(pl)
    setEditName(pl.name)
    setEditDesc(pl.description ?? '')

    const { data: pts } = await supabase
      .from('playlist_tracks')
      .select('*')
      .eq('playlist_id', id)
      .order('position', { ascending: true })

    setTracks(pts ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleSave() {
    if (!playlist || !editName.trim()) return
    const { data } = await supabase
      .from('playlists')
      .update({ name: editName.trim(), description: editDesc.trim() || null })
      .eq('id', id)
      .select()
      .single()

    if (data) {
      setPlaylist(data)
      updatePlaylist(id, data)
    }
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir esta playlist?')) return
    await supabase.from('playlist_tracks').delete().eq('playlist_id', id)
    await supabase.from('playlists').delete().eq('id', id)
    removePlaylist(id)
    router.push('/')
  }

  async function handleRemoveTrack(trackId: string) {
    await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', id)
      .eq('track_id', trackId)
    setTracks((prev) => prev.filter((t) => t.track_id !== trackId))
  }

  function handlePlayAll() {
    const jamendoTracks: JamendoTrack[] = tracks
      .map((pt) => pt.track_data as unknown as JamendoTrack)
      .filter(Boolean)
    if (jamendoTracks.length > 0) {
      play(jamendoTracks[0], jamendoTracks, id, playlist?.name)
    }
  }

  function handlePlayTrack(trackData: JamendoTrack, allTracks: JamendoTrack[]) {
    play(trackData, allTracks, id, playlist?.name)
  }

  if (loading || !playlist) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const parsedTracks: (JamendoTrack | null)[] = tracks.map((pt) => pt.track_data as unknown as JamendoTrack | null)
  const totalDuration = parsedTracks.reduce((acc, t) => acc + (t?.duration ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div
          className="w-48 h-48 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg"
          style={{
            background: playlist.cover_url
              ? `url(${playlist.cover_url}) center/cover`
              : 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
          }}
        >
          {!playlist.cover_url && (
            <svg className="w-16 h-16 opacity-50" fill="white" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          )}
        </div>

        <div className="flex flex-col justify-end flex-1 min-w-0">
          {editing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-bold bg-transparent border-b outline-none pb-1"
                style={{ borderColor: 'var(--accent-from)', color: 'var(--text-primary)' }}
                autoFocus
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full text-sm bg-transparent border-b outline-none pb-1 resize-none"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded-lg text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-1.5 rounded-lg text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Playlist
              </p>
              <h1 className="text-2xl md:text-3xl font-bold truncate">{playlist.name}</h1>
              {playlist.description && (
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {playlist.description}
                </p>
              )}
              <p className="text-sm mt-1" style={{ color: 'var(--text-disabled)' }}>
                {tracks.length} {tracks.length === 1 ? 'faixa' : 'faixas'}
                {totalDuration > 0 && ` — ${formatDuration(Math.floor(totalDuration))}`}
              </p>
            </>
          )}

          <div className="flex items-center gap-3 mt-4">
            {tracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105"
                style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Tocar
              </button>
            )}

            {!editing && (
              <>
                <button onClick={() => setEditing(true)} className="p-2 rounded-full transition-colors hover:bg-white/5" style={{ color: 'var(--text-secondary)' }} title="Editar">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={handleDelete} className="p-2 rounded-full transition-colors hover:bg-white/5" style={{ color: 'var(--text-secondary)' }} title="Excluir">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {tracks.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
              Playlist vazia
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-disabled)' }}>
              Adicione faixas usando o menu em cada música
            </p>
          </div>
        )}

        {parsedTracks.map((track, index) => {
          if (!track) return null
          const isActive = usePlayerStore.getState().currentTrack?.id === track.id
          const isPlaying = usePlayerStore.getState().isPlaying

          return (
            <div
              key={tracks[index].id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg group transition-colors cursor-pointer hover:bg-white/5"
              onClick={() => handlePlayTrack(track, parsedTracks.filter(Boolean) as JamendoTrack[])}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handlePlayTrack(track, parsedTracks.filter(Boolean) as JamendoTrack[])}
            >
              <span className="w-6 text-center text-sm" style={{ color: 'var(--text-disabled)' }}>
                {isActive ? (
                  <span style={{ color: 'var(--accent-from)' }}>
                    {isPlaying ? '♫' : '◼'}
                  </span>
                ) : (
                  index + 1
                )}
              </span>

              <img src={track.image} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: isActive ? 'var(--accent-from)' : 'var(--text-primary)' }}
                >
                  {track.name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {track.artist_name}
                </p>
              </div>

              <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                {formatDuration(track.duration)}
              </span>

              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveTrack(tracks[index].track_id) }}
                className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
                title="Remover"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
