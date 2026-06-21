'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SectionRow } from '@/components/SectionRow'
import { TrackCardSkeleton } from '@/components/Skeleton'
import type { SpotifyTrack } from '@/types/spotify'

function HomePageInner() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q')

  if (query) {
    return <SearchResults query={query} />
  }

  return <HomeContent />
}

function SearchResults({ query }: { query: string }) {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchResults() {
      if (!query.trim()) return
      setLoading(true)
      try {
        const res = await fetch(`/api/spotify?endpoint=search&q=${encodeURIComponent(query)}&type=track&limit=20`)
        if (res.ok) {
          const data = await res.json()
          setTracks(data.tracks ?? [])
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    fetchResults()
  }, [query])

  if (!loading && tracks.length === 0) {
    return <p className="text-center py-10" style={{ color: 'var(--text-disabled)' }}>Nenhum resultado encontrado para &ldquo;{query}&rdquo;</p>
  }

  return (
    <>
      <p className="text-sm mb-6" style={{ color: 'var(--text-disabled)' }}>
        Resultados para &ldquo;{query}&rdquo;
      </p>

      {loading ? (
        <div className="mb-8">
          <div className="w-36 h-5 rounded mb-3" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
          </div>
        </div>
      ) : tracks.length > 0 && (
        <SectionRow title="Músicas" tracks={tracks} />
      )}
    </>
  )
}

function HomeContent() {
  const [newReleases, setNewReleases] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHome() {
      try {
        const res = await fetch('/api/spotify?endpoint=search&q=trending&type=track&limit=10')
        if (res.ok) {
          const data = await res.json()
          setNewReleases(data.tracks ?? [])
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    fetchHome()
  }, [])

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Bem-vindo ao Ember Music</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Descubra música com Spotify</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div>
            <div className="w-48 h-5 rounded mb-3" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => <TrackCardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      ) : (
        newReleases.length > 0 && (
          <SectionRow title="Em alta" tracks={newReleases} />
        )
      )}
    </>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-3 py-10">
        <div className="w-5 h-5 border-2 border-[var(--accent-from)] border-t-transparent rounded-full animate-spin" />
        <span style={{ color: 'var(--text-secondary)' }}>Carregando...</span>
      </div>
    }>
      <HomePageInner />
    </Suspense>
  )
}
