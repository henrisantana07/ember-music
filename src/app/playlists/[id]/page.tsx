'use client'

import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePlayerStore } from '@/lib/store'
import { usePlaylistsStore } from '@/lib/playlists-store'
import { PlaylistCover } from '@/components/playlist/PlaylistCover'
import { PlaylistCoverModal } from '@/components/playlist/PlaylistCoverModal'
import { EditPlaylistModal } from '@/components/EditPlaylistModal'
import { DeletePlaylistModal } from '@/components/DeletePlaylistModal'
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal'
import { formatDuration } from '@/lib/spotify'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Track } from '@/types/music'
import type { Database } from '@/types/database'

type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row']

function PlaylistContent() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()
  const supabase = createClient()
  const { play } = usePlayerStore()
  const { updatePlaylist, removePlaylist, addPlaylist, playlists } = usePlaylistsStore()

  const [playlist, setPlaylist] = useState<Database['public']['Tables']['playlists']['Row'] | null>(null)
  const [tracks, setTracks] = useState<PlaylistTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [coverModalOpen, setCoverModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [toast, setToast] = useState<{ message: string; action?: { label: string; onClick: () => void } } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const pendingRemove = useRef<{ trackId: string; trackRow: PlaylistTrack; timeout: ReturnType<typeof setTimeout> } | null>(null)

  const showToast = useCallback((message: string, action?: { label: string; onClick: () => void }) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, action })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    let { data: pl, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !pl) {
      if (!token) { router.push('/'); return }
      const { data: plByToken } = await supabase
        .from('playlists')
        .select('*')
        .eq('share_token', token)
        .single()
      if (!plByToken) { router.push('/'); return }
      pl = plByToken
    }

    setIsOwner(user?.id === pl.user_id)
    setPlaylist(pl)

    const { data: pts } = await supabase
      .from('playlist_tracks')
      .select('*')
      .eq('playlist_id', id)
      .order('position', { ascending: true })

    setTracks(pts ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleDeleteConfirm() {
    setDeleting(true)
    await supabase.from('playlist_tracks').delete().eq('playlist_id', id)
    if (playlist?.custom_cover_url) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.storage.from('playlist-covers').remove([`${user.id}/${id}/cover`])
      }
    }
    await supabase.from('playlists').delete().eq('id', id)
    removePlaylist(id)
    setDeleteModalOpen(false)
    router.push('/biblioteca?tab=playlists')
  }

  async function handleDuplicate() {
    if (!playlist) return
    setDuplicating(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setDuplicating(false); return }

    const { data: newPlaylist, error } = await supabase
      .from('playlists')
      .insert({
        name: `${playlist.name} (cópia)`,
        description: playlist.description,
        is_public: false,
        user_id: user.id,
      })
      .select()
      .single()

    if (!error && newPlaylist && tracks.length > 0) {
      const newTracks = tracks.map((t, i) => ({
        playlist_id: newPlaylist.id,
        track_id: t.track_id,
        track_data: t.track_data,
        position: i,
        added_at: new Date().toISOString(),
      }))
      await supabase.from('playlist_tracks').insert(newTracks)
    }

    if (newPlaylist) {
      addPlaylist({ ...newPlaylist, track_count: tracks.length, cover_source: (newPlaylist.cover_source ?? 'branded') as any })
      showToast('Playlist duplicada', {
        label: 'Ver cópia',
        onClick: () => router.push(`/playlists/${newPlaylist.id}`),
      })
    }

    setDuplicating(false)
  }

  async function handleRemoveTrack(trackId: string) {
    const trackRow = tracks.find((t) => t.track_id === trackId)
    if (!trackRow) return

    setTracks((prev) => prev.filter((t) => t.track_id !== trackId))

    if (pendingRemove.current) {
      clearTimeout(pendingRemove.current.timeout)
    }

    const timeout = setTimeout(async () => {
      await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', id)
        .eq('track_id', trackId)

      const { count } = await supabase
        .from('playlist_tracks')
        .select('id', { count: 'exact', head: true })
        .eq('playlist_id', id)

      if (count === 0 && playlist?.cover_source !== 'custom') {
        await supabase
          .from('playlists')
          .update({ cover_source: 'branded', last_track_cover_url: null })
          .eq('id', id)
      }

      pendingRemove.current = null
    }, 5000)

    pendingRemove.current = { trackId, trackRow, timeout }

    showToast('Removida', {
      label: 'Desfazer',
      onClick: () => {
        if (pendingRemove.current && pendingRemove.current.trackId === trackId) {
          clearTimeout(pendingRemove.current.timeout)
          setTracks((prev) => {
            const exists = prev.find((t) => t.track_id === trackId)
            if (exists) return prev
            const restored = [...prev, trackRow].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            return restored
          })
          pendingRemove.current = null
          setToast(null)
          if (toastTimer.current) clearTimeout(toastTimer.current)
        }
      },
    })
  }

  async function handleShare() {
    if (!playlist) return
    if (!playlist.is_public) {
      showToast('Compartilhe apenas playlists públicas')
      return
    }
    if (playlist.share_token) {
      const url = `${window.location.origin}/playlists/${id}?token=${playlist.share_token}`
      await navigator.clipboard.writeText(url)
      showToast('Link copiado!')
      return
    }
    const res = await fetch(`/api/playlists/${id}/share`, { method: 'POST' })
    const data = await res.json()
    if (data.share_token) {
      setPlaylist((prev) => prev ? { ...prev, share_token: data.share_token } : prev)
      updatePlaylist(id, { share_token: data.share_token } as any)
      const url = `${window.location.origin}/playlists/${id}?token=${data.share_token}`
      await navigator.clipboard.writeText(url)
      showToast('Link copiado!')
    }
  }

  async function handleRevokeShare() {
    await fetch(`/api/playlists/${id}/share`, { method: 'DELETE' })
    setPlaylist((prev) => prev ? { ...prev, share_token: null } : prev)
    updatePlaylist(id, { share_token: null } as any)
    showToast('Compartilhamento removido')
  }

  function handlePlayAll() {
    const tracksToPlay: Track[] = tracks
      .map((pt) => pt.track_data as unknown as Track)
      .filter(Boolean)
    if (tracksToPlay.length > 0) {
      play(tracksToPlay[0], tracksToPlay, id, playlist?.name)
    }
  }

  function handlePlayTrack(trackData: Track, allTracks: Track[]) {
    play(trackData, allTracks, id, playlist?.name)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tracks.findIndex((t) => t.id === active.id)
    const newIndex = tracks.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const previous = [...tracks]
    const reordered = [...tracks]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    setTracks(reordered)

    const updates = reordered.map((t, i) => ({
      id: t.id,
      playlist_id: id,
      track_id: t.track_id,
      track_data: t.track_data,
      position: i,
    }))

    const { error } = await supabase
      .from('playlist_tracks')
      .upsert(updates, { onConflict: 'id' })

    if (error) {
      setTracks(previous)
      showToast('Erro ao reordenar')
    }
  }

  if (loading || !playlist) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const parsedTracks: (Track | null)[] = tracks.map((pt) => pt.track_data as unknown as Track | null)
  const totalDuration = parsedTracks.reduce((acc, t) => acc + (t?.duration ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto relative">
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <PlaylistCover
          playlist={playlist as any}
          size={192}
          onClick={isOwner ? () => setCoverModalOpen(true) : undefined}
        />

        <div className="flex flex-col justify-end flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Playlist
            </p>
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
            >
              {playlist.is_public ? '🌐 Pública' : '🔒 Privada'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold truncate">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {playlist.description}
            </p>
          )}
          <p className="text-sm mt-1" style={{ color: 'var(--text-disabled)' }}>
            Criada por {isOwner ? 'você' : 'outro usuário'} · {tracks.length} {tracks.length === 1 ? 'faixa' : 'faixas'}
            {totalDuration > 0 && ` — ${formatDuration(Math.floor(totalDuration))}`}
          </p>

          {!isOwner && !playlist.is_public && (
            <div className="mt-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
              Faça login para salvar esta playlist
            </div>
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

            {tracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                ⇄ Aleatório
              </button>
            )}

            {isOwner && (
              <button onClick={() => setEditModalOpen(true)} className="p-2 rounded-full transition-colors hover:bg-white/5" style={{ color: 'var(--text-secondary)' }} title="Editar">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {isOwner && (
              <button onClick={handleDuplicate} disabled={duplicating} className="p-2 rounded-full transition-colors hover:bg-white/5 disabled:opacity-50" style={{ color: 'var(--text-secondary)' }} title="Duplicar">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}

            {isOwner && (
              <button onClick={() => setDeleteModalOpen(true)} className="p-2 rounded-full transition-colors hover:bg-white/5" style={{ color: 'var(--text-secondary)' }} title="Excluir">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}

            <button onClick={handleShare} className="p-2 rounded-full transition-colors hover:bg-white/5" style={{ color: playlist.is_public ? 'var(--text-secondary)' : 'var(--text-disabled)' }} title={playlist.is_public ? 'Compartilhar' : 'Torne pública para compartilhar'}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {tracks.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: 'var(--text-disabled)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
              Esta playlist ainda não tem músicas
            </p>
            <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-disabled)' }}>
              Adicione faixas usando o menu em cada música
            </p>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tracks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tracks.map((pt, index) => {
              const track = pt.track_data as unknown as Track | null
              if (!track) return null
              const state = usePlayerStore.getState()
              const isActive = state.currentTrack?.id === track.id

              return (
                <SortableTrackRow
                  key={pt.id}
                  id={pt.id}
                  track={track}
                  index={index}
                  isActive={isActive}
                  isPlaying={state.isPlaying}
                  isOwner={isOwner}
                  onClick={() => handlePlayTrack(track, tracks.map((t) => t.track_data as unknown as Track).filter(Boolean))}
                  onRemove={() => handleRemoveTrack(pt.track_id)}
                />
              )
            })}
          </SortableContext>
        </DndContext>
      </div>

      <EditPlaylistModal
        open={editModalOpen}
        playlist={playlist}
        onClose={() => setEditModalOpen(false)}
      />
      <PlaylistCoverModal
        open={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
        playlistId={id}
        currentCoverSource={playlist.cover_source as any}
        currentCoverUrl={playlist.custom_cover_url}
      />
      <DeletePlaylistModal
        open={deleteModalOpen}
        playlistName={playlist?.name ?? ''}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        deleting={deleting}
      />

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-3 rounded-xl shadow-lg text-sm"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="font-bold whitespace-nowrap"
              style={{ color: 'var(--accent-from)' }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SortableTrackRow({
  id, track, index, isActive, isPlaying, isOwner, onClick, onRemove,
}: {
  id: string
  track: Track
  index: number
  isActive: boolean
  isPlaying: boolean
  isOwner: boolean
  onClick: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as unknown as number,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2 rounded-lg group transition-colors cursor-pointer hover:bg-white/5"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing touch-none"
        style={{ color: 'var(--text-disabled)' }}
        onClick={(e) => e.stopPropagation()}
        title="Arrastar"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
        </svg>
      </button>

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
        <p className="text-sm font-medium truncate" style={{ color: isActive ? 'var(--accent-from)' : 'var(--text-primary)' }}>
          {track.name}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
          {track.artist_name}
        </p>
      </div>

      <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
        {formatDuration(track.duration)}
      </span>

      {isOwner && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
          title="Remover"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default function PlaylistPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }} />
      </div>
    }>
      <PlaylistContent />
    </Suspense>
  )
}
