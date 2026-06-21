'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrackCard } from '@/components/TrackCard'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import type { SpotifyTrack } from '@/types/spotify'
import type { User } from '@supabase/supabase-js'

const PAGE_SIZE = 20

export default function FavoritesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
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
    setLoading(true)
    supabase
      .from('favorites')
      .select('track_data', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1)
      .then(({ data }) => {
        if (data) {
          const parsed = data.map((f) => f.track_data as unknown as SpotifyTrack).filter(Boolean)
          setTracks(parsed)
          setHasMore(parsed.length === PAGE_SIZE)
        }
        setLoading(false)
      })
  }, [user])

  const loadMore = useCallback(() => {
    if (!user) return
    setLoadingMore(true)
    supabase
      .from('favorites')
      .select('track_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(tracks.length, tracks.length + PAGE_SIZE - 1)
      .then(({ data }) => {
        if (data) {
          const parsed = data.map((f) => f.track_data as unknown as SpotifyTrack).filter(Boolean)
          setTracks((prev) => [...prev, ...parsed])
          setHasMore(parsed.length === PAGE_SIZE)
        } else {
          setHasMore(false)
        }
        setLoadingMore(false)
      })
  }, [user, tracks.length])

  const { sentinelRef } = useInfiniteScroll({ onLoadMore: loadMore, hasMore, loading: loadingMore })

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
        <>
          <p className="text-sm mb-4" style={{ color: 'var(--text-disabled)' }}>
            {tracks.length} {tracks.length === 1 ? 'faixa' : 'faixas'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tracks.map((track) => (
              <TrackCard key={track.id} track={track} tracks={tracks} />
            ))}
          </div>
          {hasMore && <div ref={sentinelRef} className="h-10" />}
          {loadingMore && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
