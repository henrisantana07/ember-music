'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArtistHeader } from '@/components/artist/ArtistHeader'
import { ArtistHeaderSkeleton } from '@/components/artist/ArtistHeaderSkeleton'
import { usePlayerStore } from '@/lib/store'
import type { Artist, Track } from '@/types/music'

export default function ArtistPage() {
  const params = useParams()
  const artistId = params.id as string
  const [artist, setArtist] = useState<Artist | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const play = usePlayerStore((s) => s.play)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/spotify?endpoint=artists&id=${artistId}&limit=50`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) {
          setError(res.error)
          setLoading(false)
          return
        }
        const a = res.artist ?? res.results?.[0]
        if (!a) {
          setError('Artista não encontrado')
          setLoading(false)
          return
        }
        setArtist(a)
        setTracks(res.top_tracks ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError('Erro ao carregar artista')
        setLoading(false)
      })
  }, [artistId])

  function handlePlay() {
    if (tracks.length > 0) {
      play(tracks, 0)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <ArtistHeaderSkeleton />
      </div>
    )
  }

  if (error || !artist) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 max-w-4xl mx-auto">
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          {error || 'Artista não encontrado'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 rounded-full text-sm font-bold"
          style={{
            background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
            color: '#fff',
          }}
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <ArtistHeader artist={artist} onPlay={handlePlay} />

      <div
        className="mt-8 rounded-2xl border-2 border-dashed p-12 text-center"
        style={{ borderColor: 'var(--bg-surface)', color: 'var(--text-disabled)' }}
      >
        <p className="text-sm font-medium">Mais conteúdo em breve</p>
      </div>
    </div>
  )
}
