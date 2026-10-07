import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchYouTube, YOUTUBE_SEARCH_CACHE_TTL } from '@/lib/youtube-service'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const pageToken = searchParams.get('pageToken')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 20)

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 })
  }

  if (q.length > 100) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 })
  }

  let userId: string | undefined
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch {
  }

  try {
    const { tracks, nextPageToken } = await searchYouTube(q, {
      pageToken: pageToken ?? undefined,
      ip,
      userId,
    })

    const limitedTracks = tracks.slice(0, limit)

    return NextResponse.json({ tracks: limitedTracks, nextPageToken }, {
      headers: {
        'Cache-Control': `public, s-maxage=${YOUTUBE_SEARCH_CACHE_TTL}, stale-while-revalidate=${YOUTUBE_SEARCH_CACHE_TTL * 2}`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'YouTube search error'
    if (message === 'RATE_LIMIT' || message === 'RATE_LIMIT_USER') {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
    if (message.includes('YOUTUBE_API_KEY')) {
      return NextResponse.json(
        { error: 'YouTube search is not configured. Please contact the administrator.' },
        { status: 503 }
      )
    }
    console.error('YouTube search error:', err)
    return NextResponse.json(
      { error: 'YouTube is temporarily unavailable. Please try again in a moment.' },
      { status: 503 }
    )
  }
}