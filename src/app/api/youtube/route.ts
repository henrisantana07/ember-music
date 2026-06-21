import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.YOUTUBE_API_KEY
const BASE_URL = 'https://www.googleapis.com/youtube/v3'

export async function GET(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const maxResults = searchParams.get('maxResults') ?? '6'

  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 })
  }

  try {
    const url = new URL(`${BASE_URL}/search`)
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('q', `${q} music audio`)
    url.searchParams.set('type', 'video')
    url.searchParams.set('videoCategoryId', '10')
    url.searchParams.set('maxResults', maxResults)
    url.searchParams.set('key', API_KEY)

    const res = await fetch(url.toString(), { next: { revalidate: 300 } })

    if (!res.ok) {
      const errorBody = await res.text()
      console.error('YouTube API error:', res.status, errorBody)
      return NextResponse.json({ error: `YouTube API error: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()

    const results = (data.items ?? []).map((item: Record<string, unknown>) => ({
      id: item.id as Record<string, string>,
      videoId: (item.id as Record<string, string>)?.videoId ?? '',
      title: (item.snippet as Record<string, string>)?.title ?? '',
      channelTitle: (item.snippet as Record<string, string>)?.channelTitle ?? '',
      description: (item.snippet as Record<string, string>)?.description ?? '',
      thumbnails: (item.snippet as Record<string, unknown>)?.thumbnails ?? {},
      publishedAt: (item.snippet as Record<string, string>)?.publishedAt ?? '',
    }))

    return NextResponse.json({ results })
  } catch (err) {
    console.error('YouTube fetch failed:', err)
    return NextResponse.json({ error: 'Failed to fetch from YouTube' }, { status: 500 })
  }
}
