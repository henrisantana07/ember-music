'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SectionRow } from '@/components/SectionRow'
import { TrackCard } from '@/components/TrackCard'
import { TrackCardSkeleton } from '@/components/Skeleton'
import type { Album, Artist, Track } from '@/types/music'

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
  const selectedGenres = useMemo(() => searchParams.get('genres')?.split(',').filter(Boolean) ?? [], [searchParams])
  const artistFilter = searchParams.get('artist') ?? ''
  const durationFilter = (searchParams.get('duration') ?? '') as DurationFilter
  const yearFrom = searchParams.get('from') ?? ''
  const yearTo = searchParams.get('to') ?? ''

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

  function removeFilter(key: string, value?: string) {
    if (key === 'genres' && value) {
      updateParam('genres', selectedGenres.filter((genre) => genre !== value).join(','))
      return
    }
    updateParam(key, '')
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString())
    ;['genres', 'artist', 'duration', 'from', 'to'].forEach((key) => params.delete(key))
    router.replace(`/buscar?${params.toString()}`)
  }

  function clearYearFilter() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('from')
    params.delete('to')
    router.replace(`/buscar?${params.toString()}`)
  }

  const genreOptions = useMemo(() => Array.from(new Set(artists.flatMap((artist) => artist.genres))).filter(Boolean).sort(), [artists])
  const artistOptions = useMemo(() => Array.from(new Set([...artists.map((artist) => artist.name), ...tracks.map((track) => track.artist_name)])).filter(Boolean).sort(), [artists, tracks])
  const years = useMemo(() => Array.from(new Set(albums.map((album) => album.release_date?.slice(0, 4)).filter(Boolean))).sort(), [albums])

  const filteredTracks = useMemo(() => tracks.filter((track) => {
    const artistOk = !artistFilter || track.artist_name.toLowerCase().includes(artistFilter.toLowerCase())
    return artistOk && matchesDuration(track, durationFilter)
  }), [artistFilter, durationFilter, tracks])

  const filteredAlbums = useMemo(() => albums.filter((album) => {
    const artistOk = !artistFilter || album.artist_name.toLowerCase().includes(artistFilter.toLowerCase())
    const year = Number(album.release_date?.slice(0, 4))
    const fromOk = !yearFrom || (year && year >= Number(yearFrom))
    const toOk = !yearTo || (year && year <= Number(yearTo))
    return artistOk && fromOk && toOk
  }), [albums, artistFilter, yearFrom, yearTo])

  const filteredArtists = useMemo(() => artists.filter((artist) => !artistFilter || artist.name.toLowerCase().includes(artistFilter.toLowerCase())), [artistFilter, artists])
  const activeFilterCount = selectedGenres.length + Number(!!artistFilter) + Number(!!durationFilter) + Number(!!yearFrom || !!yearTo)
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

      <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 border-y border-white/5" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <select disabled={genreOptions.length === 0} value="" onChange={(e) => updateParam('genres', [...selectedGenres, e.target.value].filter(Boolean).join(','))} className="rounded-full px-3 py-2 text-sm border border-white/10 disabled:opacity-50" style={{ backgroundColor: 'var(--bg-surface)' }} title={genreOptions.length === 0 ? 'A busca da Deezer não retorna gêneros para estes resultados' : 'Gênero'}>
            <option value="">Gênero</option>
            {genreOptions.filter((genre) => !selectedGenres.includes(genre)).map((genre) => <option key={genre} value={genre}>{genre}</option>)}
          </select>
          <ArtistFilter key={artistFilter} value={artistFilter} options={artistOptions} onChange={(value) => updateParam('artist', value)} />
          <select value={durationFilter} onChange={(e) => updateParam('duration', e.target.value)} className="rounded-full px-3 py-2 text-sm border border-white/10" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <option value="">Duração</option>
            <option value="short">Curtas (até 2min)</option>
            <option value="medium">Médias (2-5min)</option>
            <option value="long">Longas (5min+)</option>
          </select>
          <select value={yearFrom} onChange={(e) => updateParam('from', e.target.value)} className="rounded-full px-3 py-2 text-sm border border-white/10" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <option value="">Ano de</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <select value={yearTo} onChange={(e) => updateParam('to', e.target.value)} className="rounded-full px-3 py-2 text-sm border border-white/10" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <option value="">Ano até</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {selectedGenres.map((genre) => <FilterChip key={genre} label={genre} onRemove={() => removeFilter('genres', genre)} />)}
            {artistFilter && <FilterChip label={`Artista: ${artistFilter}`} onRemove={() => removeFilter('artist')} />}
            {durationFilter && <FilterChip label={durationLabels[durationFilter as Exclude<DurationFilter, ''>]} onRemove={() => removeFilter('duration')} />}
            {(yearFrom || yearTo) && <FilterChip label={`${yearFrom || '...'}-${yearTo || '...'}`} onRemove={clearYearFilter} />}
            <button onClick={clearFilters} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ color: 'var(--accent-solid)' }}>Limpar filtros</button>
          </div>
        )}
      </div>

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

function ArtistFilter({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(nextValue: string) {
    setDraft(nextValue)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(normalizeQuery(nextValue)), 350)
  }

  return (
    <div className="relative">
      <input list="artist-filter-options" value={draft} onChange={(e) => handleChange(e.target.value)} placeholder="Artista" className="w-44 rounded-full px-3 py-2 text-sm border border-white/10 focus:outline-none focus:ring-2" style={{ backgroundColor: 'var(--bg-surface)', '--tw-ring-color': 'var(--accent-solid)' } as CSSProperties} />
      <datalist id="artist-filter-options">{options.map((name) => <option key={name} value={name} />)}</datalist>
    </div>
  )
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
  return <section><h2 className="text-xl font-bold mb-4">Artistas</h2><div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">{artists.map((artist) => <a key={artist.id} href={`/artists/${artist.id}`} className="w-36 flex-shrink-0 p-3 rounded-xl text-center transition-colors hover:bg-white/5"><img src={artist.image || '/placeholder.svg'} alt={artist.name} className="w-full aspect-square rounded-full object-cover mb-3" loading="lazy" /><p className="text-sm font-semibold truncate">{artist.name}</p></a>)}</div></section>
}

function AlbumSection({ albums }: { albums: Album[] }) {
  return <section><h2 className="text-xl font-bold mb-4">Álbuns</h2><div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">{albums.map((album) => <a key={album.id} href={`/albums/${album.id}`} className="w-40 flex-shrink-0 p-3 rounded-xl transition-colors hover:bg-white/5"><img src={album.image || '/placeholder.svg'} alt={album.name} className="w-full aspect-square rounded-lg object-cover mb-3" loading="lazy" /><p className="text-sm font-semibold truncate">{album.name}</p><p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{album.artist_name}</p></a>)}</div></section>
}

export default function SearchPage() {
  return <Suspense fallback={<ResultsSkeleton />}><SearchPageInner /></Suspense>
}
