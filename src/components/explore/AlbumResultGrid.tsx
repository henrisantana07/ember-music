'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePlaylistsStore } from '@/lib/playlists-store'
import type { Album, Track } from '@/types/music'
import type { User } from '@supabase/supabase-js'
import type { Json } from '@/types/database'

interface AlbumResultGridProps {
  albums: Album[]
  loading?: boolean
  maxItems?: number
}

export function AlbumResultGrid({ albums, loading, maxItems }: AlbumResultGridProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const supabase = createClient()
  const { addPlaylist } = usePlaylistsStore()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  async function handleSaveAlbum(e: React.MouseEvent, album: Album) {
    e.preventDefault()
    if (!user) { showToast('Faça login para salvar álbuns'); return }
    if (savingId) return
    if (savedIds.has(album.id)) { showToast('Álbum já salvo'); return }

    setSavingId(album.id)

    try {
      const res = await fetch(`/api/deezer?endpoint=albums&id=${album.id}`)
      const data = await res.json()
      const tracks: Track[] = data.tracks ?? []
      if (tracks.length === 0) { showToast('Nenhuma faixa encontrada'); return }

      const now = new Date().toISOString()

      const { data: newPlaylist, error: playlistError } = await supabase
        .from('playlists')
        .insert({
          name: album.name,
          description: `Álbum de ${album.artist_name}`,
          cover_source: 'track',
          custom_cover_url: null,
          last_track_cover_url: album.image || null,
          user_id: user.id,
          is_public: false,
        })
        .select()
        .single()

      if (playlistError || !newPlaylist) throw playlistError

      const inserts = tracks.map((track, i) => ({
        playlist_id: newPlaylist.id,
        track_id: track.id,
        track_data: track as unknown as Json,
        position: i,
        added_at: now,
      }))

      const { error: tracksError } = await supabase.from('playlist_tracks').insert(inserts)
      if (tracksError) throw tracksError

      addPlaylist({
        ...newPlaylist,
        track_count: tracks.length,
        is_public: false,
        collaborative: null,
        share_token: null,
      } as any)

      setSavedIds(prev => new Set(prev).add(album.id))
      showToast(`"${album.name}" salvo na sua biblioteca!`)
    } catch {
      showToast('Erro ao salvar. Tente novamente.')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: maxItems ?? 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square rounded-lg skeleton" />
            <div className="h-4 w-3/4 rounded skeleton" />
            <div className="h-3 w-1/2 rounded skeleton" />
          </div>
        ))}
      </div>
    )
  }

  const displayAlbums = maxItems ? albums.slice(0, maxItems) : albums
  if (displayAlbums.length === 0) return null

  return (
    <><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {displayAlbums.map((album) => {
        const isSaving = savingId === album.id
        const isSaved = savedIds.has(album.id)

        return (
          <div key={album.id} className="group relative p-3 rounded-xl transition-colors hover:bg-white/5">
            <a href={`/albums/${album.id}`} className="block">
              <div className="relative mb-2">
                <img
                  src={album.image || '/placeholder.svg'}
                  alt={album.name}
                  className="w-full aspect-square rounded-lg object-cover"
                  loading="lazy"
                />
                <div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-10"
                  style={{ background: 'var(--accent-overlay)' }}
                >
                  <button
                    onClick={(e) => handleSaveAlbum(e, album)}
                    disabled={!user || isSaving || isSaved}
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-150 group-hover:scale-105"
                    style={{
                      background: isSaved
                        ? 'var(--accent-solid)'
                        : 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                    }}
                    title={isSaved ? 'Salvo' : 'Salvar álbum como playlist'}
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isSaved ? (
                      <svg className="w-5 h-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-sm font-semibold truncate">{album.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{album.artist_name}</p>
              <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                {album.release_date ? album.release_date.split('-')[0] : ''}
              </p>
            </a>
          </div>
        )
      })}
    </div>
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm shadow-lg animate-slide-up" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
          {toast}
        </div>
      )}
    </>
  )
}
