'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Track } from '@/types/music'
import { getGenreGradient } from '@/constants/genreColors'
import { ExploreEmptyState } from './ExploreEmptyState'
import { ExploreResults } from './ExploreResults'
import { TrackResultGrid } from './TrackResultGrid'
import { ExploreTrackSkeleton } from './skeletons/ExploreTrackSkeleton'

function GenrePage({ genero, genreId }: { genero: string; genreId: string }) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const gradient = getGenreGradient(genero)

  useEffect(() => {
    fetch(`/api/spotify?endpoint=genre-tracks&id=${genreId}&limit=50`)
      .then(res => res.json())
      .then(data => setTracks(data.results ?? []))
      .catch(() => setTracks([]))
      .finally(() => setLoading(false))
  }, [genreId])

  return (
    <div
      className="mx-auto space-y-6"
      style={{ maxWidth: 1100, paddingLeft: 32, paddingRight: 32 }}
    >
      <div
        className="rounded-2xl p-8 -mx-8"
        style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
      >
        <h1 className="text-4xl font-bold capitalize" style={{ color: '#F5F1ED', textShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
          {genero}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(245,241,237,0.7)' }}>
          {tracks.length > 0 ? `${tracks.length} faixas disponíveis` : 'A carregar...'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <ExploreTrackSkeleton key={i} compact />)}
        </div>
      ) : (
        <TrackResultGrid tracks={tracks} />
      )}
    </div>
  )
}

export function ExplorePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') ?? ''
  const genero = searchParams.get('genero') ?? ''
  const genreId = searchParams.get('genreId') ?? ''
  const [user, setUser] = useState<User | null>(null)
  const [userTracks, setUserTracks] = useState<Track[]>([])
  const [userLabel, setUserLabel] = useState('Novidades do Jamendo')
  const [activeTab, setActiveTab] = useState('tudo')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
  }, [])

  useEffect(() => {
    if (!user) return
    fetch('/api/spotify?endpoint=featured&limit=5')
      .then(res => res.json())
      .then(data => {
        setUserTracks(data.results ?? [])
        setUserLabel('Baseado nas suas preferências')
      })
      .catch(() => {})
  }, [user])

  function handleSearch(q: string) {
    const sanitized = q.trim().replace(/\s+/g, ' ')
    if (sanitized) {
      router.push(`/buscar?q=${encodeURIComponent(sanitized)}`)
    }
  }

  useEffect(() => {
    setActiveTab('tudo')
  }, [query])

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
  }, [])

  if (genero && genreId) {
    return <GenrePage genero={genero} genreId={genreId} />
  }

  const isSearching = !!query

  return (
    <div className="transition-opacity duration-200" key={isSearching ? 'results' : 'empty'}>
      {isSearching ? (
        <ExploreResults query={query} activeTab={activeTab} onTabChange={handleTabChange} />
      ) : (
        <ExploreEmptyState user={user} onSearch={handleSearch} userTracks={userTracks} userLabel={userLabel} />
      )}
    </div>
  )
}
