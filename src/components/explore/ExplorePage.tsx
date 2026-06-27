'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Track } from '@/types/music'
import { dispatchArtistOptions } from '@/lib/search-artists'
import { ExploreEmptyState } from './ExploreEmptyState'
import { ExploreResults } from './ExploreResults'

export function ExplorePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') ?? ''
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
