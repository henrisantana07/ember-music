'use client'

import { useEffect, useState } from 'react'
import { FollowButton } from '@/components/FollowButton'
import { createClient } from '@/lib/supabase/client'

interface FollowedArtist {
  artist_id: string
  artist_data: { id: string; name: string; image: string } | null
  followed_at: string
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<FollowedArtist[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadArtists() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('followed_artists')
        .select('*')
        .eq('user_id', user.id)
        .order('followed_at', { ascending: false })

      if (error) {
        console.error('Error fetching followed artists:', error)
      } else {
        setArtists(data as unknown as FollowedArtist[])
      }
      setLoading(false)
    }
    void loadArtists()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full px-4 md:px-8" style={{ maxWidth: 1100 }}>
      <h1 className="text-2xl font-bold mb-6">Meus Artistas</h1>
      {artists.length === 0 ? (
        <div className="py-20 text-center" style={{ color: 'var(--text-secondary)' }}>
          Você ainda não segue nenhum artista.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((a) => (
            <div key={a.artist_id}
              className="flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-white/5"
              style={{ background: 'var(--bg-elevated)' }}>
              <a href={`/artists/${a.artist_id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <img
                  src={a.artist_data?.image || '/placeholder.svg'}
                  alt={a.artist_data?.name ?? a.artist_id}
                  className="w-14 h-14 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{a.artist_data?.name ?? 'Artista'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Seguindo desde {new Date(a.followed_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </a>
              <FollowButton artistId={a.artist_id} artistData={a.artist_data ?? undefined} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
