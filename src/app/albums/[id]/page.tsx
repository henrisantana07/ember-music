'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ShareButton } from '@/components/ShareButton'
import { SaveAlbumButton } from '@/components/SaveAlbumButton'
import { TrackCard } from '@/components/TrackCard'
import { usePlayerStore } from '@/lib/store'
import { useUser } from '@/hooks/use-user'
import type { Track, Album } from '@/types/music'

export default function AlbumPage() {
  const { user } = useUser()
  const params = useParams()
  const albumId = params.id as string
  const [album, setAlbum] = useState<{
    id: string; name: string; image: string; artist_name: string; artist_id: string
    release_date: string; tracks: Track[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const play = usePlayerStore((s) => s.play)

  useEffect(() => {
    fetch(`/api/deezer?endpoint=albums&id=${albumId}`).then((r) => r.json()).then((albumRes) => {
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
  }, [albumId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!album) return <div className="py-20 text-center" style={{ color: 'var(--text-secondary)' }}>Álbum não encontrado</div>

  const durationTotal = album.tracks.reduce((acc, t) => acc + (t.duration || 0), 0)
  const minutes = Math.floor(durationTotal / 60)

  return (
    <div className="mx-auto w-full px-4 md:px-8" style={{ maxWidth: 1100 }}>
      <div className="flex items-end gap-6 mb-8 p-6 rounded-2xl" style={{ background: 'var(--bg-elevated)' }}>
        <img src={album.image || '/placeholder.svg'} alt={album.name}
          className="w-48 h-48 rounded-xl object-cover shadow-lg" />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Álbum</p>
          <h1 className="text-3xl font-bold mb-2 truncate">{album.name}</h1>
          <a href={`/artists/${album.artist_id}`} className="text-sm font-semibold hover:underline" style={{ color: 'var(--text-primary)' }}>
            {album.artist_name}
          </a>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {album.release_date?.slice(0, 4)} &middot; {album.tracks.length} músicas &middot; {minutes} min
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => album.tracks.length > 0 && play(album.tracks, 0)}
              className="px-6 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(to right, var(--accent-from), var(--accent-to))', color: '#fff' }}
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {album.tracks.map((track) => (
            <TrackCard key={track.id} track={track} tracks={album.tracks} user={user} />
          ))}
        </div>
      </div>
    </div>
  )
}
