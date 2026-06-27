'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Track, Album, Artist } from '@/types/music'
import { getGenreGradient } from '@/constants/genreColors'
import { ExploreEmptyState } from './ExploreEmptyState'
import { ExploreResults } from './ExploreResults'
import { TrackResultGrid } from './TrackResultGrid'
import { ArtistResultCarousel } from './ArtistResultCarousel'
import { AlbumResultGrid } from './AlbumResultGrid'
import { ExploreTrackSkeleton } from './skeletons/ExploreTrackSkeleton'
import { ArtistCircleSkeleton } from './skeletons/ArtistCircleSkeleton'

function GenrePage({ genero }: { genero: string }) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const gradient = getGenreGradient(genero)

  useEffect(() => {
    const encoded = encodeURIComponent(genero)
    Promise.all([
      fetch(`/api/spotify?endpoint=search&q=${encoded}&type=track&limit=50`).then(r => r.json()),
      fetch(`/api/spotify?endpoint=search&q=${encoded}&type=album&limit=20`).then(r => r.json()),
      fetch(`/api/spotify?endpoint=search&q=${encoded}&type=artist&limit=12`).then(r => r.json()),
    ])
      .then(([trackData, albumData, artistData]) => {
        setTracks(trackData.tracks ?? [])
        setAlbums(albumData.albums ?? [])
        setArtists(artistData.artists ?? [])
      })
      .catch(() => {
        setTracks([])
        setAlbums([])
        setArtists([])
      })
      .finally(() => setLoading(false))
  }, [genero])

  return (
    <div
      className="mx-auto space-y-8"
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
          {loading ? 'A carregar...' : `${tracks.length} faixas · ${artists.length} artistas · ${albums.length} álbuns`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-10">
          <div>
            <div className="h-5 w-28 rounded mb-4 skeleton" />
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, i) => <ArtistCircleSkeleton key={i} />)}
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-5 w-28 rounded skeleton" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="aspect-square rounded-lg skeleton" />
                  <div className="h-4 w-3/4 rounded skeleton" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <ExploreTrackSkeleton key={i} compact />)}
          </div>
        </div>
      ) : (
        <>
          {artists.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-4">Artistas</h2>
              <ArtistResultCarousel artists={artists} />
            </section>
          )}

          {albums.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-4">Álbuns</h2>
              <AlbumResultGrid albums={albums} />
            </section>
          )}

          {tracks.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-4">Faixas</h2>
              <TrackResultGrid tracks={tracks} />
            </section>
          )}
        </>
      )}
    </div>
  )
}

export function ExplorePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') ?? ''
  const genero = searchParams.get('genero') ?? ''
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

  if (genero) {
    return <GenrePage genero={genero} />
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
