'use client'

import { useEffect, useState } from 'react'
import { SectionRow } from '@/components/SectionRow'
import type { JamendoTrack } from '@/types/jamendo'

export default function HomePage() {
  const [trending, setTrending] = useState<JamendoTrack[]>([])
  const [recent, setRecent] = useState<JamendoTrack[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [trendingRes, recentRes] = await Promise.all([
          fetch('/api/jamendo?endpoint=tracks&limit=10'),
          fetch('/api/jamendo?endpoint=tracks&limit=10&offset=10'),
        ])
        const trendingData = await trendingRes.json()
        const recentData = await recentRes.json()
        setTrending(trendingData.results ?? [])
        setRecent(recentData.results ?? [])
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
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
          <span style={{ color: 'var(--text-secondary)' }}>Carregando...</span>
        </div>
      ) : (
        <>
          <SectionRow title="Em alta no Jamendo" tracks={trending} />
          <SectionRow title="Descobertas recentes" tracks={recent} />
        </>
      )}
    </div>
  )
}
