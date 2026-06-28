import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.deezer.com'

const CACHE_TTL: Record<string, number> = {
  genres: 300, featured: 300, 'charts/artists': 300,
  search: 30, tracks: 60, albums: 60, artists: 60,
  'genre-tracks': 120, 'albums/tracks': 120,
}

const RATE_LIMIT = 120
const RATE_WINDOW_MS = 60_000
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (record.count >= RATE_LIMIT) {
    return false
  }
  record.count++
  return true
}

function rateLimitResponse() {
  return NextResponse.json({ error: 'Rate limit exceeded' }, {
    status: 429,
    headers: { 'Retry-After': String(Math.ceil(RATE_WINDOW_MS / 1000)) },
  })
}

function cachedResponse(data: unknown, endpoint: string, status = 200) {
  const ttl = CACHE_TTL[endpoint] ?? 30
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}` },
  })
}

async function deezerFetch(path: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Deezer API error ${res.status}: ${body}`)
    }
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip)) return rateLimitResponse()

  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') ?? 'search'
  const q = searchParams.get('q')
  const id = searchParams.get('id') ?? searchParams.get('album_id') ?? searchParams.get('artist_id')
  const limit = searchParams.get('limit') ?? '20'
  const offset = searchParams.get('offset') ?? '0'
  const type = searchParams.get('type') ?? 'track'

  try {
    switch (endpoint) {
      case 'search': {
        if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })
        const deezerPath = `/search/${type}?q=${encodeURIComponent(q.trim().replace(/\s+/g, ' '))}&limit=${limit}&index=${offset}`
        const data = await deezerFetch(deezerPath) as { data?: Record<string, unknown>[] }
        const items = data.data ?? []
        const result: Record<string, unknown[]> = {}
        if (type === 'track') result.tracks = items.map(mapTrack)
        else if (type === 'album') result.albums = items.map(mapAlbum)
        else if (type === 'artist') result.artists = items.map(mapArtist)
        else if (type === 'playlist') result.playlists = items.map(mapPlaylist)
        return cachedResponse(result, endpoint)
      }

      case 'tracks': {
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        const data = await deezerFetch(`/track/${id}`)
        return cachedResponse({ results: [mapTrack(data as Record<string, unknown>)] }, endpoint)
      }

      case 'albums': {
        if (id) {
          const data = await deezerFetch(`/album/${id}`) as Record<string, unknown>
          const album = mapAlbum(data)
          const tracksData = data.tracks as { data?: Record<string, unknown>[] } | undefined
          const trackItems = tracksData?.data ?? []
          return cachedResponse({ album, tracks: trackItems.map(mapTrack) }, endpoint)
        }
        const data = await deezerFetch(`/chart/0/albums?limit=${limit}&index=${offset}`) as { data?: Record<string, unknown>[] }
        const items = data.data ?? []
        return cachedResponse({ results: items.map(mapAlbum) }, endpoint)
      }

      case 'albums/tracks': {
        if (!id) return NextResponse.json({ error: 'Missing album id' }, { status: 400 })
        const data = await deezerFetch(`/album/${id}/tracks?limit=${limit}&index=${offset}`) as { data?: Record<string, unknown>[] }
        const trackItems = data.data ?? []
        return cachedResponse({ results: trackItems.map(mapTrack) }, endpoint)
      }

      case 'artists': {
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        const [artistData, topTracksData, albumsData, relatedData] = await Promise.all([
          deezerFetch(`/artist/${id}`) as Promise<Record<string, unknown>>,
          deezerFetch(`/artist/${id}/top?limit=${limit}`) as Promise<{ data?: Record<string, unknown>[] }>,
          deezerFetch(`/artist/${id}/albums?limit=10`) as Promise<{ data?: Record<string, unknown>[] }>,
          deezerFetch(`/artist/${id}/related?limit=10`) as Promise<{ data?: Record<string, unknown>[] }>,
        ])
        return cachedResponse({
          artist: mapArtist(artistData),
          top_tracks: (topTracksData.data ?? []).map(mapTrack),
          albums: (albumsData.data ?? []).map(mapAlbum),
          related: (relatedData.data ?? []).map(mapArtist),
          results: [mapArtist(artistData)],
        }, endpoint)
      }

      case 'featured': {
        const data = await deezerFetch(`/chart?limit=${limit}`) as Record<string, unknown>
        const tracksData = data.tracks as { data?: Record<string, unknown>[] } | undefined
        const trackItems = tracksData?.data ?? []
        return cachedResponse({ results: trackItems.map(mapTrack) }, endpoint)
      }

      case 'genres': {
        const data = await deezerFetch(`/genre`) as { data?: Record<string, unknown>[] }
        const items = data.data ?? []
        return cachedResponse({ results: items.map(mapGenre) }, endpoint)
      }

      case 'genre-tracks': {
        const genreId = searchParams.get('id')
        if (!genreId) return NextResponse.json({ error: 'Missing genre id' }, { status: 400 })
        const data = await deezerFetch(`/genre/${genreId}/tracks?limit=${limit}`) as { data?: Record<string, unknown>[] }
        const items = data.data ?? []
        return cachedResponse({ results: items.map(mapTrack) }, endpoint)
      }

      case 'charts/artists': {
        const data = await deezerFetch(`/chart/0/artists?limit=${limit}`) as { data?: Record<string, unknown>[] }
        const items = data.data ?? []
        return cachedResponse({ results: items.map(mapArtist) }, endpoint)
      }

      default:
        return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deezer API error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function mapTrack(item: Record<string, unknown>) {
  const artist = item.artist as Record<string, unknown> | undefined
  const album = item.album as Record<string, unknown> | undefined
  return {
    id: String(item.id ?? ''),
    name: (item.title as string) ?? '',
    duration: (item.duration as number) ?? 0,
    artist_id: String(artist?.id ?? ''),
    artist_name: (artist?.name as string) ?? '',
    album_id: String(album?.id ?? ''),
    album_name: (album?.title as string) ?? '',
    image: (album?.cover_medium as string) ?? '',
    audio: (item.preview as string) ?? null,
    url: (item.link as string) ?? '',
  }
}

function mapAlbum(item: Record<string, unknown>) {
  const artist = item.artist as Record<string, unknown> | undefined
  return {
    id: String(item.id ?? ''),
    name: (item.title as string) ?? '',
    artist_id: String(artist?.id ?? ''),
    artist_name: (artist?.name as string) ?? '',
    image: (item.cover_medium as string) ?? '',
    release_date: (item.release_date as string) ?? '',
    total_tracks: (item.nb_tracks as number) ?? 0,
    url: (item.link as string) ?? '',
  }
}

function mapArtist(item: Record<string, unknown>) {
  return {
    id: String(item.id ?? ''),
    name: (item.name as string) ?? '',
    image: (item.picture_medium as string) ?? '',
    image_xl: (item.picture_xl as string) ?? '',
    followers: (item.nb_fan as number) ?? 0,
    genres: [] as string[],
    url: (item.link as string) ?? '',
    website: (item.website as string) ?? '',
  }
}

function mapPlaylist(item: Record<string, unknown>) {
  const creator = item.creator as Record<string, unknown> | undefined
  return {
    id: String(item.id ?? ''),
    name: (item.title as string) ?? '',
    description: (item.description as string) ?? '',
    image: (item.picture_medium as string) ?? '',
    owner: (creator?.name as string) ?? '',
    tracks_total: (item.nb_tracks as number) ?? 0,
    url: (item.link as string) ?? '',
  }
}

function mapGenre(item: Record<string, unknown>) {
  return {
    id: String(item.id ?? ''),
    name: (item.name as string) ?? '',
    image: (item.picture_medium as string) ?? '',
  }
}
