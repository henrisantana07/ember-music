import { NextRequest, NextResponse } from 'next/server'
import {
  MUSIC_GENRES,
  getYouTubeAlbum,
  getYouTubeChannel,
  getYouTubeTrending,
  getYouTubeVideoTrack,
  searchYouTube,
  searchYouTubeChannelVideos,
  searchYouTubeChannels,
  searchYouTubeGenre,
  searchYouTubePlaylists,
  YOUTUBE_SEARCH_CACHE_TTL,
} from '@/lib/youtube-service'

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
  if (record.count >= RATE_LIMIT) return false
  record.count++
  return true
}

function json(data: unknown, status = 200, cacheSeconds = YOUTUBE_SEARCH_CACHE_TTL) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': cacheSeconds > 0
        ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
        : 'no-store',
    },
  })
}

function errorResponse(message: string) {
  if (message === 'RATE_LIMIT' || message === 'RATE_LIMIT_USER') {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } })
  }
  if (message.includes('YOUTUBE_API_KEY')) {
    return NextResponse.json({ error: 'YouTube is not configured.' }, { status: 503 })
  }
  console.error('[api/youtube]', message)
  return NextResponse.json({ error: 'YouTube is temporarily unavailable.' }, { status: 503 })
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(RATE_WINDOW_MS / 1000)) },
    })
  }

  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') ?? 'search'
  const q = searchParams.get('q')
  const id = searchParams.get('id') ?? searchParams.get('album_id') ?? searchParams.get('artist_id') ?? ''
  const limit = parseInt(searchParams.get('limit') ?? '20', 10) || 20
  const type = searchParams.get('type') ?? 'track'

  try {
    switch (endpoint) {
      case 'search': {
        if (!q) return json({ error: 'Missing query' }, 400)
        if (type === 'album') {
          const { albums } = await searchYouTubePlaylists(q, Math.min(limit, 20))
          return json({ albums })
        }
        if (type === 'artist') {
          const { artists } = await searchYouTubeChannels(q, Math.min(limit, 12))
          return json({ artists })
        }
        const { tracks } = await searchYouTube(q, { ip, limit: Math.min(limit, 50) })
        return json({ tracks })
      }

      case 'tracks': {
        if (!id) return json({ error: 'Missing id' }, 400)
        const track = await getYouTubeVideoTrack(id)
        return json({ results: track ? [track] : [] })
      }

      case 'albums': {
        if (id) {
          const { album, tracks } = await getYouTubeAlbum(id, Math.min(limit, 50))
          return json({ album, tracks })
        }
        const { albums } = await searchYouTubePlaylists('popular music albums', Math.min(limit, 20))
        return json({ results: albums })
      }

      case 'albums/tracks': {
        if (!id) return json({ error: 'Missing album id' }, 400)
        const { tracks } = await getYouTubeAlbum(id, Math.min(limit, 50))
        return json({ results: tracks })
      }

      case 'artists': {
        if (!id) return json({ error: 'Missing id' }, 400)
        const { artist, top_tracks, albums, related } = await getYouTubeChannel(id, Math.min(limit, 50))
        // Resultado degradado (quota de busca esgotada) não deve ir pro CDN:
        // assim a página recarregada tenta a API de novo em vez de servir listas vazias por horas.
        const degraded = !top_tracks.length && !albums.length && !related.length
        return json(
          { artist, top_tracks, albums, related, results: artist ? [artist] : [], degraded: degraded || undefined },
          200,
          degraded ? 0 : YOUTUBE_SEARCH_CACHE_TTL
        )
      }

      case 'featured': {
        const { tracks } = await getYouTubeTrending(Math.min(limit, 50))
        return json({ results: tracks })
      }

      case 'genres': {
        return json({ results: MUSIC_GENRES })
      }

      case 'genre-tracks': {
        const genreName = searchParams.get('id') ?? q
        if (!genreName) return json({ error: 'Missing genre id' }, 400)
        const { tracks } = await searchYouTubeGenre(genreName, Math.min(limit, 50))
        return json({ results: tracks })
      }

      case 'charts/artists': {
        const { artists } = await searchYouTubeChannels(q ?? 'popular music', Math.min(limit, 12))
        return json({ results: artists })
      }

      case 'related': {
        if (!id) return json({ error: 'Missing id' }, 400)
        const exclude = searchParams.get('exclude') ?? ''
        const { tracks } = await searchYouTubeChannelVideos(id, { limit: Math.min(limit, 12), exclude })
        return json({ results: tracks })
      }

      default:
        return json({ error: 'Unknown endpoint' }, 400)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'YouTube API error'
    return errorResponse(message)
  }
}
