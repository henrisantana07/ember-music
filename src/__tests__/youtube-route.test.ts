import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/youtube/search/route'

const { searchYouTubeMock } = vi.hoisted(() => ({
  searchYouTubeMock: vi.fn(),
}))

vi.mock('@/lib/youtube-service', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/youtube-service')>()
  return { ...actual, searchYouTube: searchYouTubeMock }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) },
  })),
}))

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/youtube/search?${query}`)
}

function makeTracks(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `youtube:v${i}`,
    name: `Video ${i}`,
    duration: 60,
    source: 'youtube',
  }))
}

beforeEach(() => {
  searchYouTubeMock.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/youtube/search', () => {
  it('retorna 400 sem query', async () => {
    const res = await GET(makeRequest(''))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Missing query' })
  })

  it('retorna 400 com query acima de 100 caracteres', async () => {
    const res = await GET(makeRequest(`q=${'a'.repeat(101)}`))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Query too long' })
  })

  it('retorna 200 com tracks e Cache-Control do TTL', async () => {
    searchYouTubeMock.mockResolvedValue({ tracks: makeTracks(3), nextPageToken: 'NEXT' })

    const res = await GET(makeRequest('q=hello'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tracks).toHaveLength(3)
    expect(body.nextPageToken).toBe('NEXT')
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=21600')
  })

  it('aplica o limite de resultados (máx 20)', async () => {
    searchYouTubeMock.mockResolvedValue({ tracks: makeTracks(25), nextPageToken: null })

    const res = await GET(makeRequest('q=muitas&limit=100'))

    const body = await res.json()
    expect(body.tracks).toHaveLength(20)
  })

  it('retorna 429 no rate limit com Retry-After', async () => {
    searchYouTubeMock.mockRejectedValue(new Error('RATE_LIMIT'))

    const res = await GET(makeRequest('q=limite'))

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
  })

  it('retorna 429 no rate limit de usuário', async () => {
    searchYouTubeMock.mockRejectedValue(new Error('RATE_LIMIT_USER'))

    const res = await GET(makeRequest('q=limite'))

    expect(res.status).toBe(429)
  })

  it('retorna 503 quando a API key não está configurada', async () => {
    searchYouTubeMock.mockRejectedValue(new Error('YOUTUBE_API_KEY not configured'))

    const res = await GET(makeRequest('q=semchave'))

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({
      error: 'YouTube search is not configured. Please contact the administrator.',
    })
  })

  it('retorna 503 em erro inesperado', async () => {
    searchYouTubeMock.mockRejectedValue(new Error('boom'))

    const res = await GET(makeRequest('q=erro'))

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({
      error: 'YouTube is temporarily unavailable. Please try again in a moment.',
    })
  })

  it('passa ip, pageToken e userId para o serviço', async () => {
    searchYouTubeMock.mockResolvedValue({ tracks: [], nextPageToken: null })

    await GET(makeRequest('q=hello&pageToken=TOK'))

    expect(searchYouTubeMock).toHaveBeenCalledWith('hello', expect.objectContaining({
      pageToken: 'TOK',
      ip: expect.any(String),
    }))
  })
})
