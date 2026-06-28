'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Album } from '@/types/music'
import type { Json } from '@/types/database'

interface SaveAlbumButtonProps {
  album: Album
}

export function SaveAlbumButton({ album }: SaveAlbumButtonProps) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from('saved_albums')
        .select('id')
        .eq('user_id', data.user.id)
        .eq('album_id', album.id)
        .maybeSingle()
        .then(({ data: d }) => setSaved(!!d))
    })
  }, [album.id])

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setLoading(true)
    if (saved) {
      await supabase.from('saved_albums').delete().eq('user_id', user.id).eq('album_id', album.id)
      setSaved(false)
    } else {
      await supabase.from('saved_albums').insert({
        user_id: user.id,
        album_id: album.id,
        album_data: album as unknown as Json,
      })
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
      title={saved ? 'Remover da biblioteca' : 'Salvar na biblioteca'}
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
