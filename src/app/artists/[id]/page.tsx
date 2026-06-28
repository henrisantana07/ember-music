'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArtistHeader } from '@/components/artist/ArtistHeader'
import { ArtistHeaderSkeleton } from '@/components/artist/ArtistHeaderSkeleton'
import { TrackCard } from '@/components/TrackCard'
import { Carousel } from '@/components/Carousel'
import { usePlayerStore } from '@/lib/store'
import type { Artist, Track, Album } from '@/types/music'

export default function ArtistPage() {
  const params = useParams()
  const artistId = params.id as string
  const [artist, setArtist] = useState<Artist | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [related, setRelated] = useState<Artist[]>([])
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
        setAlbums(res.albums ?? [])
        setRelated(res.related ?? [])
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

      {tracks.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold mb-4">Top Músicas</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track) => (
              <TrackCard key={track.id} track={track} tracks={tracks} />
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold mb-4">Álbuns</h2>
          <Carousel>
            {albums.slice(0, 10).map((album) => (
              <div key={album.id} className="flex-shrink-0 w-40 p-3 rounded-xl transition-colors hover:bg-white/5 group relative">
                <a href={`/albums/${album.id}`} className="block">
                  <div className="relative mb-2">
                    <img src={album.image || '/placeholder.svg'} alt={album.name}
                      className="w-full aspect-square rounded-lg object-cover shadow-md" loading="lazy" />
                    <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center bg-black/40">
                      <button className="p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors" title="Adicionar aos favoritos">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium truncate text-center">{album.name}</p>
                  <p className="text-xs text-center truncate" style={{ color: 'var(--text-disabled)' }}>
                    {album.release_date?.slice(0, 4) || ''}
                  </p>
                </a>
              </div>
            ))}
          </Carousel>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-10 mb-10">
          <h2 className="text-xl font-bold mb-4">Artistas Relacionados</h2>
          <Carousel>
            {related.map((rel) => (
              <a
                key={rel.id}
                href={`/artists/${rel.id}`}
                className="flex-shrink-0 w-32 flex flex-col items-center gap-2 p-3 rounded-xl transition-colors hover:bg-white/5"
              >
                <img
                  src={rel.image || '/placeholder.svg'}
                  alt={rel.name}
                  className="w-24 h-24 rounded-full object-cover shadow-md"
                  loading="lazy"
                />
                <p className="text-sm font-medium text-center truncate w-full">{rel.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {rel.followers.toLocaleString('pt-BR')} seguidores
                </p>
              </a>
            ))}
          </Carousel>
        </section>
      )}
    </div>
  )
}
