import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.jamendo.com/v3.0'
const CLIENT_ID = process.env.NEXT_PUBLIC_JAMENDO_CLIENT_ID!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const [tracksRes, artistsRes] = await Promise.all([
      fetch(
        `${BASE_URL}/tracks/?client_id=${CLIENT_ID}&format=json&search=${encodeURIComponent(q)}&limit=4&order=popularity_total`,
        { next: { revalidate: 30 } }
      ),
      fetch(
        `${BASE_URL}/artists/?client_id=${CLIENT_ID}&format=json&search=${encodeURIComponent(q)}&limit=3`,
        { next: { revalidate: 30 } }
      ),
    ])

    const [tracksData, artistsData] = await Promise.all([
      tracksRes.json(),
      artistsRes.json(),
    ])

    const tracks = (tracksData.results ?? []).map((t: Record<string, unknown>) => ({
      type: 'track',
      id: t.id,
      name: t.name,
      artist_name: t.artist_name,
      image: t.image,
      audio: t.audio,
      duration: t.duration,
    }))

    const artists = (artistsData.results ?? []).map((a: Record<string, unknown>) => ({
      type: 'artist',
      id: a.id,
      name: a.name,
      image: a.image,
    }))

    return NextResponse.json({ results: [...artists, ...tracks] })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
