'use client'

import { useEffect, useState } from 'react'
import { SectionRow } from '@/components/SectionRow'
import { TrackCardSkeleton } from '@/components/Skeleton'
import { createClient } from '@/lib/supabase/client'
import type { JamendoTrack } from '@/types/jamendo'

export default function HomePage() {
  const [trending, setTrending] = useState<JamendoTrack[]>([])
  const [recent, setRecent] = useState<JamendoTrack[]>([])
  const [recommended, setRecommended] = useState<JamendoTrack[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        let favTags: string[] = []

        if (user) {
          const { data: favs } = await supabase
            .from('favorites')
            .select('track_data')
            .eq('user_id', user.id)
            .limit(5)

          if (favs?.length) {
            const allTags = favs
              .map((f) => {
                const td = f.track_data as Record<string, string[]> | null
                return td?.tags ?? []
              })
              .flat()
              .slice(0, 3)
            favTags = [...new Set(allTags as string[])]
          }
        }

        const [trendingRes, recentRes] = await Promise.all([
          fetch('/api/jamendo?endpoint=tracks&limit=10'),
          fetch('/api/jamendo?endpoint=tracks&limit=10&offset=10'),
        ])
        const trendingData = await trendingRes.json()
        const recentData = await recentRes.json()
        setTrending(trendingData.results ?? [])
        setRecent(recentData.results ?? [])

        if (favTags.length > 0) {
          const tag = favTags[Math.floor(Math.random() * favTags.length)]
          const recRes = await fetch(`/api/jamendo?endpoint=tracks&tags=${tag}&limit=10`)
          const recData = await recRes.json()
          setRecommended(recData.results ?? [])
        }
      } catch (err) {
        console.error('Failed to fetch tracks:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Bem-vindo ao Ember Music</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Descubra música independente do mundo todo</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div>
            <div className="w-48 h-5 rounded mb-3" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
            </div>
          </div>
          <div>
            <div className="w-48 h-5 rounded mb-3" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      ) : (
        <>
          {recommended.length > 0 && (
            <SectionRow title="Recomendados para você" tracks={recommended} />
          )}
          <SectionRow title="Em alta no Jamendo" tracks={trending} />
          <SectionRow title="Descobertas recentes" tracks={recent} />
        </>
      )}
    </div>
  )
}
