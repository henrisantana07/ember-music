'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Album } from '@/types/music'
import type { Json } from '@/types/database'

const ALBUM_PLAYLIST_NAME = 'Álbuns Salvos'

interface SaveAlbumButtonProps {
  album: Album
}

async function ensureAlbumPlaylist(supabase: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('playlists')
    .select('id')
    .eq('user_id', userId)
    .eq('name', ALBUM_PLAYLIST_NAME)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created } = await supabase
    .from('playlists')
    .insert({
      user_id: userId,
      name: ALBUM_PLAYLIST_NAME,
      description: 'Álbuns salvos automaticamente',
      is_public: false,
      cover_source: 'branded',
    })
    .select('id')
    .single()

  return created!.id
}

export function SaveAlbumButton({ album }: SaveAlbumButtonProps) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || cancelled) return
      const playlistId = await ensureAlbumPlaylist(supabase, data.user.id)
      const { data: row } = await supabase
        .from('playlist_albums')
        .select('id')
        .eq('playlist_id', playlistId)
        .eq('album_id', album.id)
        .maybeSingle()
      if (!cancelled) setSaved(!!row)
    })
    return () => { cancelled = true }
  }, [album.id])

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setLoading(true)
    const playlistId = await ensureAlbumPlaylist(supabase, user.id)

    if (saved) {
      await supabase
        .from('playlist_albums')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('album_id', album.id)
      setSaved(false)
    } else {
      const { data: maxPos } = await supabase
        .from('playlist_albums')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1)

      const nextPosition = (maxPos?.[0]?.position ?? -1) + 1

      await supabase
        .from('playlist_albums')
        .insert({
          playlist_id: playlistId,
          album_id: album.id,
          album_data: album as unknown as Json,
          position: nextPosition,
        })

      if (album.image) {
        await supabase
          .from('playlists')
          .update({ cover_source: 'track', last_track_cover_url: album.image })
          .eq('id', playlistId)
      }

      setSaved(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="p-1.5 backdrop-blur-md rounded-full text-white transition-all duration-200 disabled:opacity-50"
      style={{
        background: saved
          ? 'linear-gradient(135deg, var(--accent-from), var(--accent-to))'
          : 'rgba(255,255,255,0.2)',
      }}
      title={saved ? 'Remover da playlist' : 'Salvar na playlist'}
    >
      <svg
        className="w-4 h-4"
        fill={saved ? 'white' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  )
}
