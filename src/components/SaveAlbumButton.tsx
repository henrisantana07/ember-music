'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePlaylistsStore } from '@/lib/playlists-store'
import type { Album, Track } from '@/types/music'
import type { Json } from '@/types/database'

interface SaveAlbumButtonProps {
  album: Album
}

export function SaveAlbumButton({ album }: SaveAlbumButtonProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { addPlaylist } = usePlaylistsStore()

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (saving) return

    setSaving(true)

    try {
      const res = await fetch(`/api/spotify?endpoint=albums&id=${album.id}`)
      const data = await res.json()
      const tracks: Track[] = data.tracks ?? []
      if (tracks.length === 0) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
        cover_source: 'branded',
        is_public: false,
        collaborative: null,
        share_token: null,
      } as any)

      router.push(`/playlists/${newPlaylist.id}`)
    } catch (e) {
      console.error('Erro ao salvar álbum:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-150 hover:scale-105 disabled:cursor-default disabled:opacity-50"
      style={{
        background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
      }}
      title="Salvar álbum como playlist"
    >
      {saving ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5} fill="none" strokeLinecap="round">
          <path d="M12 4v16m8-8H4" />
        </svg>
      )}
    </button>
  )
}
