import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.jamendo.com/v3.0'
const CLIENT_ID = process.env.NEXT_PUBLIC_JAMENDO_CLIENT_ID!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') ?? 'tracks'

  const params = new URLSearchParams()
  params.set('client_id', CLIENT_ID)
  params.set('format', 'json')

  const q = searchParams.get('q')
  const genre = searchParams.get('genre')
  const durationMin = searchParams.get('duration_min')
  const durationMax = searchParams.get('duration_max')
  const year = searchParams.get('year')
  const limit = searchParams.get('limit') ?? '20'
  const offset = searchParams.get('offset') ?? '0'
  const id = searchParams.get('id')
  const artist_id = searchParams.get('artist_id')
  const album_id = searchParams.get('album_id')
  const order = searchParams.get('order')
  const tags = searchParams.get('tags')

  params.set('limit', limit)
  params.set('offset', offset)

  if (endpoint === 'search' && q) {
    params.set('search', q)
  }

  if (genre) params.set('tags', genre)
  if (tags) params.set('tags', tags)
  if (id) params.set('id', id)
  if (artist_id) params.set('artist_id', artist_id)
  if (album_id) params.set('album_id', album_id)
  if (order) params.set('order', order)
  if (durationMin) params.set('duration_min', durationMin)
  if (durationMax) params.set('duration_max', durationMax)
  if (year) {
    params.set('datebetween_from', `${year}-01-01`)
    params.set('datebetween_to', `${year}-12-31`)
  }

  const path = endpoint === 'search' ? '/tracks/' : `/${endpoint}/`

  try {
    const res = await fetch(`${BASE_URL}${path}?${params.toString()}`, {
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Jamendo API error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch from Jamendo' },
      { status: 500 }
    )
  }
}
