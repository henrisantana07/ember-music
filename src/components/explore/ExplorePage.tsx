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

function GenrePage({ genero, genreId }: { genero: string; genreId: string }) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const gradient = getGenreGradient(genero)

  useEffect(() => {
    const encoded = encodeURIComponent(genero)
    const promises: Promise<Response>[] = [
      fetch(`/api/spotify?endpoint=search&q=${encoded}&type=track&limit=50`),
      fetch(`/api/spotify?endpoint=search&q=${encoded}&type=album&limit=20`),
      fetch(`/api/spotify?endpoint=search&q=${encoded}&type=artist&limit=12`),
    ]
    if (genreId) {
      promises.push(fetch(`/api/spotify?endpoint=genre-tracks&id=${genreId}&limit=50`))
    }
    Promise.all(promises.map(p => p.then(r => r.json())))
      .then((results) => {
        const trackData = results[0] as { tracks?: Track[] }
        const albumData = results[1] as { albums?: Album[] }
        const artistData = results[2] as { artists?: Artist[] }
        const genreTrackData = results[3] as { results?: Track[] } | undefined

        const mergedTracks = [...(trackData.tracks ?? [])]
        if (genreTrackData?.results) {
          const existingIds = new Set(mergedTracks.map(t => t.id))
          genreTrackData.results.forEach(t => {
            if (!existingIds.has(t.id)) {
              mergedTracks.push(t)
              existingIds.add(t.id)
            }
          })
        }

        const mergedAlbums = [...(albumData.albums ?? [])]
        const mergedArtists = [...(artistData.artists ?? [])]

        if (mergedTracks.length > 0) {
          const albumMap = new Map<string, Album>()
          mergedAlbums.forEach(a => albumMap.set(a.id, a))
          const artistMap = new Map<string, Artist>()
          mergedArtists.forEach(a => artistMap.set(a.id, a))

          mergedTracks.forEach(t => {
            if (!albumMap.has(t.album_id)) {
              albumMap.set(t.album_id, {
                id: t.album_id,
                name: t.album_name,
                artist_id: t.artist_id,
                artist_name: t.artist_name,
                image: t.image,
                release_date: '',
                total_tracks: 0,
                url: '',
              })
            }
            if (!artistMap.has(t.artist_id)) {
              artistMap.set(t.artist_id, {
                id: t.artist_id,
                name: t.artist_name,
                image: t.image,
                image_xl: '',
                followers: 0,
                genres: [],
                url: '',
                website: '',
              })
            }
          })

          setAlbums(Array.from(albumMap.values()))
          setArtists(Array.from(artistMap.values()))
        } else {
          setAlbums(mergedAlbums)
          setArtists(mergedArtists)
        }

        setTracks(mergedTracks)
      })
      .catch(() => {
        setTracks([])
        setAlbums([])
        setArtists([])
      })
      .finally(() => setLoading(false))
  }, [genero, genreId])

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
              <ArtistResultCarousel artists={artists} maxItems={12} />
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
  const genreId = searchParams.get('genreId') ?? ''
  const artistFilter = searchParams.get('artist') ?? ''
  const genreFilter = searchParams.get('genre') ?? ''
  const durationFilter = (searchParams.get('duration') ?? '') as '' | 'short' | 'medium' | 'long'
  const [user, setUser] = useState<User | null>(null)
  const [userTracks, setUserTracks] = useState<Track[]>([])
  const [userLabel, setUserLabel] = useState('Novidades do Jamendo')
  const activeTab = searchParams.get('tab') ?? 'tudo'
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

  const handleTabChange = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'tudo') params.delete('tab')
    else params.set('tab', tab)
    router.replace(`/buscar?${params.toString()}`)
  }, [searchParams, router])

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    ;['artist', 'genre', 'duration'].forEach((k) => params.delete(k))
    router.replace(`/buscar?${params.toString()}`)
  }, [searchParams, router])

  if (genero) {
    return <GenrePage genero={genero} genreId={genreId} />
  }

  const isSearching = !!query

  return (
    <div className="transition-opacity duration-200" key={isSearching ? 'results' : 'empty'}>
      {isSearching ? (
        <ExploreResults
          query={query}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          artistFilter={artistFilter}
          genreFilter={genreFilter}
          durationFilter={durationFilter}
          onClearFilters={clearFilters}
        />
      ) : (
        <ExploreEmptyState user={user} onSearch={handleSearch} userTracks={userTracks} userLabel={userLabel} />
      )}
    </div>
  )
}
