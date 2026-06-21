'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { TrackCard } from '@/components/TrackCard'
import { FollowButton } from '@/components/FollowButton'
import { ShareButton } from '@/components/ShareButton'
import { usePlayerStore } from '@/lib/store'
import type { Track } from '@/types/music'

interface ArtistData {
  id: string
  name: string
  image: string
  website?: string
  tracks?: Track[]
  albums?: { id: string; name: string; image: string }[]
}

export default function ArtistPage() {
  const params = useParams()
  const artistId = params.id as string
  const [artist, setArtist] = useState<ArtistData | null>(null)
  const [loading, setLoading] = useState(true)
  const play = usePlayerStore((s) => s.play)

  useEffect(() => {
    fetch(`/api/spotify?endpoint=artists&id=${artistId}&limit=50`).then((r) => r.json()).then((artistRes) => {
      const a = artistRes?.artist ?? artistRes?.results?.[0]
      if (!a) { setLoading(false); return }
      setArtist({
        id: a.id,
        name: a.name,
        image: a.image || (a.album_image ? a.album_image.replace('/albums/', '/artists/') : '/placeholder.svg'),
        website: a.website,
        tracks: artistRes?.top_tracks ?? [],
        albums: artistRes?.albums?.map((al: Record<string, string>) => ({
          id: al.id,
          name: al.name,
          image: al.image,
        })) ?? [],
      })
      setLoading(false)
    })
  }, [artistId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!artist) return <div className="py-20 text-center" style={{ color: 'var(--text-secondary)' }}>Artista não encontrado</div>

  const dummyArtistData = { id: artist.id, name: artist.name, image: artist.image }

  return (
    <div>
      <div className="flex items-end gap-6 mb-8 p-6 rounded-2xl" style={{ background: 'var(--bg-elevated)' }}>
        <img src={artist.image || '/placeholder.svg'} alt={artist.name}
          className="w-48 h-48 rounded-full object-cover shadow-lg" />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Artista</p>
          <h1 className="text-4xl font-bold mb-3 truncate">{artist.name}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => artist.tracks && artist.tracks.length > 0 && play(artist.tracks, 0)}
              className="px-6 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(to right, var(--accent-from), var(--accent-to))', color: '#fff' }}
            >
              Tocar
            </button>
            <FollowButton artistId={artist.id} artistData={dummyArtistData} />
            <ShareButton title={artist.name} text={`Ouça ${artist.name} no Ember Music`} variant="full" />
          </div>
        </div>
      </div>

      {artist.albums && artist.albums.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Álbuns</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {artist.albums.slice(0, 10).map((album) => (
              <a key={album.id} href={`/albums/${album.id}`}
                className="flex-shrink-0 w-40 p-3 rounded-xl transition-colors hover:bg-white/5">
                <img src={album.image || '/placeholder.svg'} alt={album.name}
                  className="w-full aspect-square rounded-lg object-cover mb-2 shadow-md" />
                <p className="text-sm font-medium truncate text-center">{album.name}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold mb-4">Músicas</h2>
        {artist.tracks && artist.tracks.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {artist.tracks.map((track) => (
              <TrackCard key={track.id} track={track} tracks={artist.tracks!} />
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Nenhuma música encontrada.</p>
        )}
      </section>
    </div>
  )
}
