'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrackCard } from '@/components/TrackCard'
import type { JamendoTrack } from '@/types/jamendo'
import type { User } from '@supabase/supabase-js'

export default function FavoritesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [tracks, setTracks] = useState<JamendoTrack[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (!data.user) router.push('/login')
    })
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('favorites')
      .select('track_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setTracks(data.map((f) => f.track_data as unknown as JamendoTrack).filter(Boolean))
        }
        setLoading(false)
      })
  }, [user])

  if (!user) return null

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Suas Favoritas</h1>

      {loading ? (
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
          <span style={{ color: 'var(--text-secondary)' }}>Carregando...</span>
        </div>
      ) : tracks.length === 0 ? (
        <p className="text-center py-10" style={{ color: 'var(--text-disabled)' }}>
          Nenhuma faixa favoritada ainda. Explore e favorite suas músicas!
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} tracks={tracks} />
          ))}
        </div>
      )}
    </div>
  )
}
