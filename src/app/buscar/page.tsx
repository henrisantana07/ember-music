'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SectionRow } from '@/components/SectionRow'
import { TrackCard } from '@/components/TrackCard'
import { TrackCardSkeleton } from '@/components/Skeleton'
import { FollowButton } from '@/components/FollowButton'
import { dispatchArtistOptions } from '@/lib/search-artists'
import type { Album, Artist, Track } from '@/types/music'
import type { Json } from '@/types/database'

type DurationFilter = '' | 'short' | 'medium' | 'long'

const durationLabels: Record<Exclude<DurationFilter, ''>, string> = {
  short: 'Curtas (até 2min)',
  medium: 'Médias (2-5min)',
  long: 'Longas (5min+)',
}

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function matchesDuration(track: Track, duration: DurationFilter) {
  if (!duration) return true
  if (duration === 'short') return track.duration <= 120
  if (duration === 'medium') return track.duration > 120 && track.duration <= 300
  return track.duration > 300
}

function SearchPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = normalizeQuery(searchParams.get('q') ?? '')
  const artistFilter = searchParams.get('artist') ?? ''
  const durationFilter = (searchParams.get('duration') ?? '') as DurationFilter

  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [popular, setPopular] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    if (!query) return
    const controller = new AbortController()
    async function fetchResults() {
      setLoading(true)
      setError(null)
      try {
        const encoded = encodeURIComponent(query)
        const [trackRes, albumRes, artistRes] = await Promise.all([
          fetch(`/api/spotify?endpoint=search&q=${encoded}&type=track&limit=36`, { signal: controller.signal }),
          fetch(`/api/spotify?endpoint=search&q=${encoded}&type=album&limit=14`, { signal: controller.signal }),
          fetch(`/api/spotify?endpoint=search&q=${encoded}&type=artist&limit=12`, { signal: controller.signal }),
        ])
        if (!trackRes.ok || !albumRes.ok || !artistRes.ok) throw new Error('search failed')
        const [trackData, albumData, artistData] = await Promise.all([trackRes.json(), albumRes.json(), artistRes.json()])
        setTracks(trackData.tracks ?? [])
        setAlbums(albumData.albums ?? [])
        setArtists(artistData.artists ?? [])
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError('Não foi possível buscar agora. Tente novamente.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void fetchResults()
    return () => controller.abort()
  }, [query, retryNonce])

  useEffect(() => {
    fetch('/api/spotify?endpoint=search&q=trending&type=track&limit=6')
      .then((res) => res.ok ? res.json() : { tracks: [] })
      .then((data) => setPopular(data.tracks ?? []))
      .catch(() => setPopular([]))
  }, [])

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`/buscar?${params.toString()}`)
  }

  function removeFilter(key: string) {
    updateParam(key, '')
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString())
      ;['artist', 'duration'].forEach((key) => params.delete(key))
    router.replace(`/buscar?${params.toString()}`)
  }

  const artistOptions = useMemo(() => Array.from(new Set([...artists.map((artist) => artist.name), ...tracks.map((track) => track.artist_name)])).filter(Boolean).sort(), [artists, tracks])

  useEffect(() => { dispatchArtistOptions(artistOptions) }, [artistOptions])

  const filteredTracks = useMemo(() => tracks.filter((track) => {
    const artistOk = !artistFilter || track.artist_name.toLowerCase().includes(artistFilter.toLowerCase())
    return artistOk && matchesDuration(track, durationFilter)
  }), [artistFilter, durationFilter, tracks])

  const filteredAlbums = useMemo(() => albums.filter((album) => {
    return !artistFilter || album.artist_name.toLowerCase().includes(artistFilter.toLowerCase())
  }), [albums, artistFilter])

  const filteredArtists = useMemo(() => artists.filter((artist) => !artistFilter || artist.name.toLowerCase().includes(artistFilter.toLowerCase())), [artistFilter, artists])
  const activeFilterCount = Number(!!artistFilter) + Number(!!durationFilter)
  const hasResults = filteredTracks.length > 0 || filteredAlbums.length > 0 || filteredArtists.length > 0

  if (!query) {
    return <EmptyShell title="Busque por músicas, artistas ou álbuns" text="Digite algo na barra acima para começar." popular={popular} />
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm mb-1" style={{ color: 'var(--text-disabled)' }}>Resultados para</p>
        <h1 className="text-3xl font-bold">&ldquo;{query}&rdquo;</h1>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 -mx-4 md:-mx-6 px-4 md:px-6 py-3 border-y border-white/5" style={{ backgroundColor: 'var(--bg-base)' }}>
          {artistFilter && <FilterChip label={`Artista: ${artistFilter}`} onRemove={() => removeFilter('artist')} />}
          {durationFilter && <FilterChip label={durationLabels[durationFilter as Exclude<DurationFilter, ''>]} onRemove={() => removeFilter('duration')} />}
          <button onClick={clearFilters} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ color: 'var(--accent-solid)' }}>Limpar filtros</button>
        </div>
      )}

      {loading && <ResultsSkeleton />}
      {error && <ErrorState message={error} onRetry={() => setRetryNonce((value) => value + 1)} />}
      {!loading && !error && !hasResults && <EmptyShell title={`Nenhum resultado para "${query}"`} text={`${activeFilterCount > 0 ? `Você tem ${activeFilterCount} filtros ativos. Tente remover alguns ou ` : 'Tente '}verificar a ortografia e usar termos mais gerais.`} popular={popular} />}
      {!loading && !error && hasResults && (
        <div className="space-y-10">
          {filteredTracks.length > 0 && <section><h2 className="text-xl font-bold mb-4">Faixas</h2><div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{filteredTracks.map((track) => <TrackCard key={track.id} track={track} tracks={filteredTracks} />)}</div></section>}
          {filteredArtists.length > 0 && <PeopleSection artists={filteredArtists} />}
          {filteredAlbums.length > 0 && <AlbumSection albums={filteredAlbums} />}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <button onClick={onRemove} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent-solid)' }}>{label}<span aria-hidden>×</span></button>
}

function ResultsSkeleton() {
  return <div><div className="h-5 w-28 rounded mb-4" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} /><div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{Array.from({ length: 12 }).map((_, index) => <TrackCardSkeleton key={index} />)}</div></div>
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}><p className="font-semibold mb-2">{message}</p><button onClick={onRetry} className="btn-primary text-sm mt-3">Tentar novamente</button></div>
}

function EmptyShell({ title, text, popular }: { title: string; text: string; popular: Track[] }) {
  return <div className="space-y-8"><div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}><div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-solid)' }}><svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v.01M12 13.5h.01" /></svg></div><h2 className="text-xl font-bold mb-2">{title}</h2><p className="max-w-md mx-auto text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</p></div>{popular.length > 0 && <SectionRow title="Você pode gostar de" tracks={popular} />}</div>
}

function PeopleSection({ artists }: { artists: Artist[] }) {
  return (
    <section>
      <h2 className="text-xl font-bold mb-4">Artistas</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
        {artists.map((artist) => (
          <div key={artist.id} className="w-36 flex-shrink-0 p-3 rounded-xl text-center transition-colors hover:bg-white/5 flex flex-col items-center">
            <a href={`/artists/${artist.id}`} className="w-full flex flex-col items-center">
              <img src={artist.image || '/placeholder.svg'} alt={artist.name} className="w-full aspect-square rounded-full object-cover mb-3" loading="lazy" />
              <p className="text-sm font-semibold truncate mb-3">{artist.name}</p>
            </a>
            <FollowButton artistId={artist.id} artistData={{ id: artist.id, name: artist.name, image: artist.image }} />
          </div>
        ))}
      </div>
    </section>
  )
}

function AlbumSection({ albums }: { albums: Album[] }) {
  return (
    <section>
      <h2 className="text-xl font-bold mb-4">Álbuns</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {albums.map((album) => (
          <div key={album.id} className="flex-shrink-0 w-40 p-3 rounded-xl transition-colors hover:bg-white/5 group relative">
            <a href={`/albums/${album.id}`} className="block">
              <div className="relative mb-2">
                <img src={album.image || '/placeholder.svg'} alt={album.name} className="w-full aspect-square rounded-lg object-cover mb-3" loading="lazy" />
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 bg-black/40">
                  <button className="p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors" title="Adicionar aos favoritos">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <FollowButton artistId={album.artist_id} artistData={{ id: album.artist_id, name: album.artist_name, image: '/placeholder.svg' }} />
                </div>
              </div>
              <p className="text-sm font-semibold truncate">{album.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{album.artist_name}</p>
            </a>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function SearchPage() {
  return <Suspense fallback={<ResultsSkeleton />}><SearchPageInner /></Suspense>
}
