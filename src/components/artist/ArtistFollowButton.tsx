'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useArtistsStore } from '@/lib/artists-store'
import type { Json } from '@/types/database'

interface ArtistFollowButtonProps {
  artistId: string
  artistData?: Json
}

export function ArtistFollowButton({ artistId, artistData }: ArtistFollowButtonProps) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { addArtist, removeArtist } = useArtistsStore()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from('followed_artists')
        .select('id')
        .eq('user_id', data.user.id)
        .eq('artist_id', artistId)
        .maybeSingle()
        .then(({ data: d }) => setFollowing(!!d))
    })
  }, [artistId])

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setLoading(true)
    if (following) {
      await supabase.from('followed_artists').delete().eq('user_id', user.id).eq('artist_id', artistId)
      setFollowing(false)
      removeArtist(artistId)
    } else {
      await supabase.from('followed_artists').insert({
        user_id: user.id,
        artist_id: artistId,
        artist_data: artistData ?? null,
      })
      setFollowing(true)
      const parsed = artistData as { id: string; name: string; image: string } | null
      addArtist({
        artist_id: artistId,
        artist_data: parsed,
        followed_at: new Date().toISOString(),
      })
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 disabled:opacity-50"
      style={{
        background: following
          ? 'linear-gradient(135deg, var(--accent-from), var(--accent-to))'
          : 'transparent',
        color: following ? 'var(--bg-base)' : 'var(--text-primary)',
        border: following ? 'none' : '1px solid var(--text-disabled)',
      }}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={following ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {following ? 'Seguindo' : 'Seguir'}
    </button>
  )
}
