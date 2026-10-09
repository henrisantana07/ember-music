import { NextResponse } from 'next/server'

const ALLOWED_HOSTS = new Set(['i.ytimg.com', 'img.youtube.com', 'www.youtube.com'])
const ALLOWED_HOST_SUFFIXES = ['.ytimg.com', '.dzcdn.net', '.supabase.co', '.supabase.in']
const MAX_BYTES = 10 * 1024 * 1024

function resolveAllowedUrl(raw: string): URL | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const host = url.hostname.toLowerCase()
  const allowed =
    ALLOWED_HOSTS.has(host) ||
    ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix))
  return allowed ? url : null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const src = searchParams.get('src')

  if (!src) {
    return NextResponse.json({ error: 'Missing src' }, { status: 400 })
  }

  const url = resolveAllowedUrl(src)
  if (!url) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  try {
    const upstream = await fetch(url.toString(), {
      redirect: 'manual',
      headers: { accept: 'image/*' },
      next: { revalidate: 86400 },
    })

    if (upstream.status >= 300 && upstream.status < 400) {
      return NextResponse.json({ error: 'Redirects not allowed' }, { status: 502 })
    }
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
    }

    const contentType = (upstream.headers.get('content-type') ?? '').split(';')[0].trim()
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 415 })
    }

    const buffer = await upstream.arrayBuffer()
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 })
    }

    return new NextResponse(buffer, {
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 })
  }
}
