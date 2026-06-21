import { NextRequest, NextResponse } from 'next/server'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!
const BASE_URL = 'https://api.spotify.com/v1'

let accessToken: string | null = null
let tokenExpiresAt = 0

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error('Failed to get Spotify token')

  const data = await res.json()
  accessToken = data.access_token
  tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60000
  return accessToken!
}

async function spotifyFetch(endpoint: string): Promise<unknown> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Spotify API error ${res.status}: ${body}`)
  }
  return res.json()
}

function pickImage(images: Record<string, unknown>[]): string {
  const first = images?.[0]
  return (first?.url as string) ?? ''
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') ?? 'search'
  const q = searchParams.get('q')
  const id = searchParams.get('id')
  const limit = searchParams.get('limit') ?? '20'
  const offset = searchParams.get('offset') ?? '0'
  const type = searchParams.get('type') ?? 'track'

  try {
    let spotifyEndpoint = ''

    switch (endpoint) {
      case 'search': {
        if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })
        spotifyEndpoint = `/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}&offset=${offset}`
        const data = await spotifyFetch(spotifyEndpoint) as Record<string, unknown>

        const result: Record<string, unknown[]> = {}

        if (data.tracks) {
          const t = data.tracks as Record<string, unknown>
          const items = t.items as Record<string, unknown>[]
          result.tracks = items.map(mapTrack)
        }
        if (data.albums) {
          const a = data.albums as Record<string, unknown>
          const items = a.items as Record<string, unknown>[]
          result.albums = items.map(mapAlbum)
        }
        if (data.artists) {
          const a = data.artists as Record<string, unknown>
          const items = a.items as Record<string, unknown>[]
          result.artists = items.map(mapArtist)
        }
        if (data.playlists) {
          const p = data.playlists as Record<string, unknown>
          const items = p.items as Record<string, unknown>[]
          result.playlists = items.map(mapPlaylist)
        }

        return NextResponse.json(result)
      }

      case 'tracks': {
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        spotifyEndpoint = `/tracks/${id}`
        const data = await spotifyFetch(spotifyEndpoint) as Record<string, unknown>
        return NextResponse.json({ results: [mapTrack(data)] })
      }

      case 'albums': {
        if (id) {
          spotifyEndpoint = `/albums/${id}`
          const data = await spotifyFetch(spotifyEndpoint) as Record<string, unknown>
          const album = mapAlbum(data)
          const albumRaw = data as Record<string, unknown>
          const tracksRaw = albumRaw.tracks as Record<string, unknown> | undefined
          const trackItems = (tracksRaw?.items as Record<string, unknown>[]) ?? []
          return NextResponse.json({
            album,
            tracks: trackItems.map((t: Record<string, unknown>) => ({
              ...mapTrack(t),
              album_id: id,
              album_name: album.name,
              image: album.image,
            })),
          })
        }
        spotifyEndpoint = `/browse/new-releases?limit=${limit}&offset=${offset}`
        const data = await spotifyFetch(spotifyEndpoint) as Record<string, unknown>
        const albumsData = data.albums as Record<string, unknown> | undefined
        const items = (albumsData?.items as Record<string, unknown>[]) ?? []
        return NextResponse.json({ results: items.map(mapAlbum) })
      }

      case 'albums/tracks': {
        if (!id) return NextResponse.json({ error: 'Missing album id' }, { status: 400 })
        spotifyEndpoint = `/albums/${id}/tracks?limit=${limit}&offset=${offset}`
        const data = await spotifyFetch(spotifyEndpoint) as Record<string, unknown>
        const trackItems = (data.items as Record<string, unknown>[]) ?? []
        return NextResponse.json({ results: trackItems.map(mapTrack) })
      }

      case 'artists': {
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        const [artistData, topTracksData, albumsData] = await Promise.all([
          spotifyFetch(`/artists/${id}`) as Promise<Record<string, unknown>>,
          spotifyFetch(`/artists/${id}/top-tracks?market=US`) as Promise<Record<string, unknown>>,
          spotifyFetch(`/artists/${id}/albums?limit=${limit}&offset=${offset}`) as Promise<Record<string, unknown>>,
        ])
        return NextResponse.json({
          artist: mapArtist(artistData),
          top_tracks: ((topTracksData.tracks as Record<string, unknown>[]) ?? []).map(mapTrack),
          albums: ((albumsData.items as Record<string, unknown>[]) ?? []).map(mapAlbum),
        })
      }

      case 'featured': {
        spotifyEndpoint = `/browse/featured-playlists?limit=${limit}&offset=${offset}`
        const data = await spotifyFetch(spotifyEndpoint) as Record<string, unknown>
        const playlistsData = data.playlists as Record<string, unknown> | undefined
        const pItems = (playlistsData?.items as Record<string, unknown>[]) ?? []
        return NextResponse.json({ results: pItems.map(mapPlaylist) })
      }

      default:
        return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Spotify API error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function mapTrack(item: Record<string, unknown>) {
  const album = item.album as Record<string, unknown> | undefined
  const artists = (item.artists as Record<string, unknown>[]) ?? []
  const images = album?.images as Record<string, unknown>[] | undefined
  return {
    id: item.id as string,
    name: item.name as string,
    duration: Math.floor((item.duration_ms as number) / 1000),
    artist_id: artists[0]?.id as string ?? '',
    artist_name: artists[0]?.name as string ?? '',
    album_id: album?.id as string ?? '',
    album_name: album?.name as string ?? '',
    image: pickImage(images ?? []),
    audio: item.preview_url as string | null,
    spotify_url: (item.external_urls as Record<string, string>)?.spotify ?? '',
  }
}

function mapAlbum(item: Record<string, unknown>) {
  const artists = (item.artists as Record<string, unknown>[]) ?? []
  const images = item.images as Record<string, unknown>[] | undefined
  return {
    id: item.id as string,
    name: item.name as string,
    artist_id: artists[0]?.id as string ?? '',
    artist_name: artists[0]?.name as string ?? '',
    image: pickImage(images ?? []),
    release_date: item.release_date as string ?? '',
    total_tracks: item.total_tracks as number ?? 0,
    spotify_url: (item.external_urls as Record<string, string>)?.spotify ?? '',
  }
}

function mapArtist(item: Record<string, unknown>) {
  const images = item.images as Record<string, unknown>[] | undefined
  const followers = item.followers as Record<string, unknown> | undefined
  return {
    id: item.id as string,
    name: item.name as string,
    image: pickImage(images ?? []),
    followers: (followers?.total as number) ?? 0,
    genres: (item.genres as string[]) ?? [],
    spotify_url: (item.external_urls as Record<string, string>)?.spotify ?? '',
  }
}

function mapPlaylist(item: Record<string, unknown>) {
  const images = item.images as Record<string, unknown>[] | undefined
  const owner = item.owner as Record<string, unknown> | undefined
  const tracks = item.tracks as Record<string, unknown> | undefined
  return {
    id: item.id as string,
    name: item.name as string,
    description: item.description as string ?? '',
    image: pickImage(images ?? []),
    owner: (owner?.display_name as string) ?? '',
    tracks_total: (tracks?.total as number) ?? 0,
    spotify_url: (item.external_urls as Record<string, string>)?.spotify ?? '',
  }
}
