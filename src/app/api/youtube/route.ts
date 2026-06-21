import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.YOUTUBE_API_KEY
const BASE_URL = 'https://www.googleapis.com/youtube/v3'

const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000

function getCacheKey(q: string, maxResults: string, pageToken: string | null): string {
  return `${q}:${maxResults}:${pageToken ?? ''}`
}

export async function GET(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const maxResults = searchParams.get('maxResults') ?? '6'
  const pageToken = searchParams.get('pageToken')

  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 })
  }

  const cacheKey = getCacheKey(q, maxResults, pageToken)
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    const url = new URL(`${BASE_URL}/search`)
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('q', `${q} music audio`)
    url.searchParams.set('type', 'video')
    url.searchParams.set('videoCategoryId', '10')
    url.searchParams.set('maxResults', maxResults)
    url.searchParams.set('key', API_KEY)
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url.toString())

    if (res.status === 429) {
      if (cached) {
        return NextResponse.json(cached.data)
      }
      return NextResponse.json({ error: 'YouTube API quota exceeded. Try again later.' }, { status: 429 })
    }

    if (!res.ok) {
      const errorBody = await res.text()
      console.error('YouTube API error:', res.status, errorBody)
      return NextResponse.json({ error: `YouTube API error: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()

    const results = (data.items ?? []).map((item: Record<string, unknown>) => {
      const id = item.id as Record<string, string> | undefined
      const snippet = item.snippet as Record<string, unknown> | undefined
      return {
        videoId: id?.videoId ?? '',
        title: (snippet?.title as string) ?? '',
        channelTitle: (snippet?.channelTitle as string) ?? '',
        description: (snippet?.description as string) ?? '',
        thumbnails: (snippet?.thumbnails as Record<string, { url: string; width: number; height: number }>) ?? {},
        publishedAt: (snippet?.publishedAt as string) ?? '',
      }
    })

    const response = {
      results,
      nextPageToken: data.nextPageToken ?? null,
      prevPageToken: data.prevPageToken ?? null,
      totalResults: data.pageInfo?.totalResults ?? 0,
    }

    cache.set(cacheKey, { data: response, timestamp: Date.now() })

    return NextResponse.json(response)
  } catch (err) {
    console.error('YouTube fetch failed:', err)
    return NextResponse.json({ error: 'Failed to fetch from YouTube' }, { status: 500 })
  }
}
