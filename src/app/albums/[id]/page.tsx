'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ShareButton } from '@/components/ShareButton'
import { SaveAlbumButton } from '@/components/SaveAlbumButton'
import { TrackCard } from '@/components/TrackCard'
import { usePlayerStore } from '@/lib/store'
import { useUser } from '@/hooks/use-user'
import type { Track, Album } from '@/types/music'
import { ErrorState } from '@/components/ui/states'

export default function AlbumPage() {
  const { user } = useUser()
  const params = useParams()
  const albumId = params.id as string
  const [album, setAlbum] = useState<{
    id: string; name: string; image: string; artist_name: string; artist_id: string
    release_date: string; tracks: Track[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const play = usePlayerStore((s) => s.play)

  const retry = useCallback(() => {
    setError(false)
    setLoading(true)
    setAttempt((a) => a + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/deezer?endpoint=albums&id=${albumId}`)
      .then((r) => r.json())
      .then((albumRes) => {
        if (cancelled) return
        const a = albumRes?.album ?? albumRes?.results?.[0]
        if (!a) { setLoading(false); return }
        setAlbum({
          id: a.id,
          name: a.name,
          image: a.image,
          artist_name: a.artist_name,
          artist_id: a.artist_id,
          release_date: a.release_date,
          tracks: albumRes?.tracks ?? [],
        })
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setError(true); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [albumId, attempt])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-label="Carregando álbum">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar o álbum"
        description="Verifique sua conexão e tente novamente."
        action={{ label: 'Tentar novamente', onClick: retry }}
      />
    )
  }

  if (!album) return <div className="py-16 text-center" style={{ color: 'var(--text-secondary)' }}>Álbum não encontrado</div>

  const durationTotal = album.tracks.reduce((acc, t) => acc + (t.duration || 0), 0)
  const minutes = Math.floor(durationTotal / 60)

  return (
    <div className="mx-auto w-full">
      <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 mb-8 p-4 md:p-6 rounded-2xl" style={{ background: 'var(--bg-elevated)' }}>
        <img src={album.image || '/placeholder.svg'} alt={album.name}
          className="w-40 h-40 md:w-48 md:h-48 rounded-xl object-cover shadow-lg flex-shrink-0" />
        <div className="flex-1 min-w-0 w-full md:w-auto text-center md:text-left">
          <p className="text-label-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Álbum</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 truncate">{album.name}</h1>
          <a href={`/artists/${album.artist_id}`} className="text-body-large font-semibold hover:underline inline-block truncate max-w-full" style={{ color: 'var(--text-primary)' }}>
            {album.artist_name}
          </a>
          <p className="text-body-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
            {album.release_date?.slice(0, 4)} &middot; {album.tracks.length} músicas &middot; {minutes} min
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
            <button
              onClick={() => album.tracks.length > 0 && play(album.tracks, 0)}
              className="min-h-[48px] px-6 rounded-full text-label-large font-bold transition-transform hover:scale-105 state-layer"
              style={{ background: 'linear-gradient(to right, var(--accent-from), var(--accent-to))', color: 'var(--text-on-accent)' }}
            >
              Tocar tudo
            </button>
            {user && (
              <SaveAlbumButton album={album as unknown as Album} />
            )}
            <ShareButton title={album.name} text={`Ouça o álbum "${album.name}" de ${album.artist_name} no Ember Music`} variant="full" />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Faixas</h2>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {album.tracks.map((track) => (
            <TrackCard key={track.id} track={track} tracks={album.tracks} user={user} />
          ))}
        </div>
      </div>
    </div>
  )
}
