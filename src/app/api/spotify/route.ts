import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.deezer.com'

async function deezerFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Deezer API error ${res.status}: ${body}`)
  }
  return res.json()
}

export async function GET(request: NextRequest) {
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
        return NextResponse.json(result)
      }

      case 'tracks': {
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        const data = await deezerFetch(`/track/${id}`)
        return NextResponse.json({ results: [mapTrack(data as Record<string, unknown>)] })
      }

      case 'albums': {
        if (id) {
          const data = await deezerFetch(`/album/${id}`) as Record<string, unknown>
          const album = mapAlbum(data)
          const tracksData = data.tracks as { data?: Record<string, unknown>[] } | undefined
          const trackItems = tracksData?.data ?? []
          return NextResponse.json({
            album,
            tracks: trackItems.map(mapTrack),
          })
        }
        const data = await deezerFetch(`/chart/0/albums?limit=${limit}&index=${offset}`) as { data?: Record<string, unknown>[] }
        const items = data.data ?? []
        return NextResponse.json({ results: items.map(mapAlbum) })
      }

      case 'albums/tracks': {
        if (!id) return NextResponse.json({ error: 'Missing album id' }, { status: 400 })
        const data = await deezerFetch(`/album/${id}/tracks?limit=${limit}&index=${offset}`) as { data?: Record<string, unknown>[] }
        const trackItems = data.data ?? []
        return NextResponse.json({ results: trackItems.map(mapTrack) })
      }

      case 'artists': {
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        const [artistData, topTracksData] = await Promise.all([
          deezerFetch(`/artist/${id}`) as Promise<Record<string, unknown>>,
          deezerFetch(`/artist/${id}/top?limit=${limit}`) as Promise<{ data?: Record<string, unknown>[] }>,
        ])
        return NextResponse.json({
          artist: mapArtist(artistData),
          top_tracks: (topTracksData.data ?? []).map(mapTrack),
          albums: [],
          results: [mapArtist(artistData)],
        })
      }

      case 'featured': {
        const data = await deezerFetch(`/chart?limit=${limit}`) as Record<string, unknown>
        const tracksData = data.tracks as { data?: Record<string, unknown>[] } | undefined
        const trackItems = tracksData?.data ?? []
        return NextResponse.json({ results: trackItems.map(mapTrack) })
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
    followers: (item.nb_fan as number) ?? 0,
    genres: [] as string[],
    url: (item.link as string) ?? '',
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
