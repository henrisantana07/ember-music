import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/image-proxy/route'

function makeRequest(src?: string): NextRequest {
  const url =
    src === undefined
      ? 'http://localhost:3000/api/image-proxy'
      : `http://localhost:3000/api/image-proxy?src=${encodeURIComponent(src)}`
  return new NextRequest(url)
}

function stubFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GET /api/image-proxy', () => {
  it('retorna 400 sem src', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(400)
  })

  it('retorna 403 para host fora da allowlist sem chamar fetch', async () => {
    const fetchMock = stubFetch(async () => new Response('ok'))
    const res = await GET(makeRequest('https://evil.example.com/cover.jpg'))
    expect(res.status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retorna 403 para URL inválida', async () => {
    const res = await GET(makeRequest('not-a-url'))
    expect(res.status).toBe(403)
  })

  it('retorna 403 para protocolo não-http', async () => {
    const res = await GET(makeRequest('ftp://i.ytimg.com/x.jpg'))
    expect(res.status).toBe(403)
  })

  it('retorna 200 com bytes, content-type e cache para host permitido', async () => {
    stubFetch(async () => new Response(jpegBytes, { status: 200, headers: { 'content-type': 'image/jpeg' } }))
    const res = await GET(makeRequest('https://i.ytimg.com/vi/abc123/hqdefault.jpg'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/jpeg')
    expect(res.headers.get('cache-control')).toContain('max-age=86400')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(jpegBytes)
  })

  it('aceita sufixos permitidos (dzcdn e supabase)', async () => {
    stubFetch(async () => new Response(jpegBytes, { status: 200, headers: { 'content-type': 'image/webp' } }))
    const deezer = await GET(makeRequest('https://e-cdns-images.dzcdn.net/images/cover/x.jpg'))
    expect(deezer.status).toBe(200)
    const supabase = await GET(makeRequest('https://proj.supabase.co/storage/v1/object/public/cover.png'))
    expect(supabase.status).toBe(200)
  })

  it('retorna 415 quando o upstream não devolve imagem', async () => {
    stubFetch(async () => new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } }))
    const res = await GET(makeRequest('https://i.ytimg.com/vi/abc/hqdefault.jpg'))
    expect(res.status).toBe(415)
  })

  it('retorna 502 quando o upstream responde redirect', async () => {
    stubFetch(async () => new Response(null, { status: 302 }))
    const res = await GET(makeRequest('https://i.ytimg.com/vi/abc/hqdefault.jpg'))
    expect(res.status).toBe(502)
  })

  it('retorna 502 quando o upstream retorna erro', async () => {
    stubFetch(async () => new Response('nope', { status: 404 }))
    const res = await GET(makeRequest('https://i.ytimg.com/vi/abc/hqdefault.jpg'))
    expect(res.status).toBe(502)
  })

  it('retorna 502 quando o fetch lança exceção', async () => {
    stubFetch(async () => {
      throw new Error('network down')
    })
    const res = await GET(makeRequest('https://i.ytimg.com/vi/abc/hqdefault.jpg'))
    expect(res.status).toBe(502)
  })

  it('retorna 413 para imagem acima do limite de 10MB', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1)
    stubFetch(async () => new Response(big, { status: 200, headers: { 'content-type': 'image/jpeg' } }))
    const res = await GET(makeRequest('https://i.ytimg.com/vi/abc/hqdefault.jpg'))
    expect(res.status).toBe(413)
  })
})
