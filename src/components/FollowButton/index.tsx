'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import type { Json } from '@/types/database'

interface FollowButtonProps {
  artistId: string
  artistData?: Json
}

export function FollowButton({ artistId, artistData }: FollowButtonProps) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

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
    } else {
      await supabase.from('followed_artists').insert({
        user_id: user.id,
        artist_id: artistId,
        artist_data: artistData ?? null,
      })
      setFollowing(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-1.5 rounded-full text-sm font-semibold border transition-all disabled:opacity-50"
      style={{
        borderColor: following ? 'var(--accent-from)' : 'var(--text-disabled)',
        color: following ? 'var(--accent-from)' : 'var(--text-secondary)',
        backgroundColor: following ? 'var(--accent-muted)' : 'transparent',
      }}
    >
      {following ? 'Seguindo' : 'Seguir'}
    </button>
  )
}
