import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc: mockRpc })),
}))

type YoutubeService = typeof import('@/lib/youtube-service')

async function loadService(): Promise<YoutubeService> {
  vi.resetModules()
  return await import('@/lib/youtube-service')
}

function okJson(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response
}

function errResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => `error ${status}`,
  } as Response
}

const searchItem = {
  id: { videoId: 'abc123' },
  snippet: {
    title: 'Test Video',
    channelId: 'chan1',
    channelTitle: 'Test Channel',
    thumbnails: {
      high: { url: 'https://img.example/high.jpg' },
      medium: { url: 'https://img.example/medium.jpg' },
    },
    publishedAt: '2020-01-01T00:00:00Z',
  },
}

const fetchMock = vi.fn()

function mockYtApis(options?: { duration?: string; nextPageToken?: string }) {
  fetchMock.mockImplementation(async (url: string) => {
    const u = String(url)
    if (u.includes('/youtube/v3/search')) {
      return okJson({ items: [searchItem], nextPageToken: options?.nextPageToken ?? null })
    }
    if (u.includes('/youtube/v3/videos')) {
      return okJson({ items: [{ id: 'abc123', contentDetails: { duration: options?.duration ?? 'PT1H2M3S' } }] })
    }
    return errResponse(404)
  })
}

function searchCallCount(): number {
  return fetchMock.mock.calls.filter(([url]) => String(url).includes('/youtube/v3/search')).length
}

beforeEach(() => {
  vi.stubEnv('YOUTUBE_API_KEY', 'test-key')
  fetchMock.mockReset()
  mockRpc.mockReset()
  mockRpc.mockResolvedValue({ data: null, error: null })
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('normalizeQuery', () => {
  it('remove espaços das bordas, colapsa espaços internos e lowercases', async () => {
    const { normalizeQuery } = await loadService()
    expect(normalizeQuery('  Hello   World  ')).toBe('hello world')
  })

  it('mantém acentos e caracteres especiais', async () => {
    const { normalizeQuery } = await loadService()
    expect(normalizeQuery('João & Matheus')).toBe('joão & matheus')
  })

  it('retorna string vazia para whitespace-only', async () => {
    const { normalizeQuery } = await loadService()
    expect(normalizeQuery('   \t  ')).toBe('')
  })
})

describe('getCacheKey', () => {
  it('gera chave normalizada', async () => {
    const { getCacheKey } = await loadService()
    expect(getCacheKey('Hello World')).toBe('youtube:search:hello-world')
  })

  it('mesma chave para queries equivalentes (case/espaços diferentes)', async () => {
    const { getCacheKey } = await loadService()
    expect(getCacheKey('Hello World')).toBe(getCacheKey('  hello   world '))
  })
})

describe('getYouTubeTrackId', () => {
  it('prefixa ids com youtube:', async () => {
    const { getYouTubeTrackId } = await loadService()
    expect(getYouTubeTrackId('dQw4w9WgXcQ')).toBe('youtube:dQw4w9WgXcQ')
  })
})

describe('constantes', () => {
  it('respeita os valores do spec', async () => {
    const svc = await loadService()
    expect(svc.YOUTUBE_SEARCH_CACHE_TTL).toBe(21600)
    expect(svc.YOUTUBE_SEARCH_DEBOUNCE_MS).toBe(600)
    expect(svc.YOUTUBE_SEARCH_MAX_RESULTS).toBe(10)
    expect(svc.YOUTUBE_SEARCH_RATE_LIMIT).toBe(20)
    expect(svc.YOUTUBE_SEARCH_RATE_LIMIT_USER).toBe(30)
  })
})

describe('searchYouTube', () => {
  it('retorna vazio e não chama a API para query vazia', async () => {
    const { searchYouTube } = await loadService()
    expect(await searchYouTube('   ')).toEqual({ tracks: [], nextPageToken: null })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mapeia a resposta da API para Track com id youtube:', async () => {
    const { searchYouTube } = await loadService()
    mockYtApis({ nextPageToken: 'NEXT_TOKEN' })

    const { tracks, nextPageToken } = await searchYouTube('hello')

    expect(tracks).toHaveLength(1)
    expect(tracks[0]).toMatchObject({
      id: 'youtube:abc123',
      name: 'Test Video',
      duration: 3723,
      artist_id: 'chan1',
      artist_name: 'Test Channel',
      album_id: '',
      album_name: '',
      image: 'https://img.example/high.jpg',
      audio: null,
      url: 'https://www.youtube.com/watch?v=abc123',
      source: 'youtube',
      youtubeVideoId: 'abc123',
      youtubeChannelId: 'chan1',
      youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
    })
    expect(nextPageToken).toBe('NEXT_TOKEN')
  })

  it('converte duração ISO8601 de vários formatos', async () => {
    const { searchYouTube } = await loadService()

    mockYtApis({ duration: 'PT45S' })
    expect((await searchYouTube('curta')).tracks[0].duration).toBe(45)

    vi.resetModules()
    const svc2 = await loadService()
    mockYtApis({ duration: 'PT3M30S' })
    expect((await svc2.searchYouTube('media')).tracks[0].duration).toBe(210)

    vi.resetModules()
    const svc3 = await loadService()
    mockYtApis({ duration: 'PT1H2M3S' })
    expect((await svc3.searchYouTube('longa')).tracks[0].duration).toBe(3723)

    vi.resetModules()
    const svc4 = await loadService()
    mockYtApis({ duration: 'garbage' })
    expect((await svc4.searchYouTube('invalida')).tracks[0].duration).toBe(0)
  })

  it('usa cache de memória na segunda chamada (1 chamada à API)', async () => {
    const { searchYouTube } = await loadService()
    mockYtApis()

    const first = await searchYouTube('cache test')
    const second = await searchYouTube('cache test')

    expect(second.tracks).toEqual(first.tracks)
    expect(searchCallCount()).toBe(1)
  })

  it('normaliza a query antes de buscar (cache compartilhado)', async () => {
    const { searchYouTube } = await loadService()
    mockYtApis()

    await searchYouTube('  Mixed   Case ')
    await searchYouTube('mixed case')

    expect(searchCallCount()).toBe(1)
  })

  it('usa cache do Supabase quando disponível, sem chamar a API', async () => {
    const { searchYouTube } = await loadService()
    const cachedTracks = [{ id: 'youtube:cached', name: 'Cached', duration: 100 }]
    mockRpc.mockResolvedValue({
      data: { results: cachedTracks, nextPageToken: 'SB_TOKEN' },
      error: null,
    })

    const { tracks, nextPageToken } = await searchYouTube('do supabase')

    expect(tracks).toEqual(cachedTracks)
    expect(nextPageToken).toBe('SB_TOKEN')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockRpc).toHaveBeenCalledWith('youtube_cache_get', { p_key: 'youtube:search:do-supabase' })
  })

  it('salva no cache do Supabase após buscar na API', async () => {
    const { searchYouTube } = await loadService()
    mockYtApis()

    await searchYouTube('salvar')

    expect(mockRpc).toHaveBeenCalledWith('youtube_cache_set', expect.objectContaining({
      p_key: 'youtube:search:salvar',
      p_query: 'salvar',
      p_next_page_token: null,
      p_ttl_seconds: 21600,
    }))
  })

  it('ignora erro do cache Supabase e segue para a API', async () => {
    const { searchYouTube } = await loadService()
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } })
    mockYtApis()

    const { tracks } = await searchYouTube('sem cache')

    expect(tracks).toHaveLength(1)
    expect(searchCallCount()).toBe(1)
  })

  it('deduplica requisições concorrentes para a mesma query', async () => {
    const { searchYouTube } = await loadService()
    fetchMock.mockImplementation(async (url: string) => {
      await new Promise(r => setTimeout(r, 30))
      const u = String(url)
      if (u.includes('/youtube/v3/search')) return okJson({ items: [searchItem], nextPageToken: null })
      if (u.includes('/youtube/v3/videos')) return okJson({ items: [{ id: 'abc123', contentDetails: { duration: 'PT2M' } }] })
      return errResponse(404)
    })

    const [a, b, c] = await Promise.all([
      searchYouTube('dedup'),
      searchYouTube('dedup'),
      searchYouTube('dedup'),
    ])

    expect(a.tracks).toEqual(b.tracks)
    expect(b.tracks).toEqual(c.tracks)
    expect(searchCallCount()).toBe(1)
  })

  it('aplica rate limit por IP (20/min)', async () => {
    const { searchYouTube, YOUTUBE_SEARCH_RATE_LIMIT } = await loadService()
    mockYtApis()

    for (let i = 0; i < YOUTUBE_SEARCH_RATE_LIMIT; i++) {
      await searchYouTube(`rate ip ${i}`, { ip: '1.2.3.4' })
    }

    await expect(searchYouTube('uma a mais', { ip: '1.2.3.4' })).rejects.toThrow('RATE_LIMIT')
    expect(console.log).toHaveBeenCalledWith('[youtube.search.rate_limited]', expect.any(String))
  })

  it('não limita IPs diferentes', async () => {
    const { searchYouTube, YOUTUBE_SEARCH_RATE_LIMIT } = await loadService()
    mockYtApis()

    for (let i = 0; i < YOUTUBE_SEARCH_RATE_LIMIT; i++) {
      await searchYouTube(`outro ip ${i}`, { ip: '1.2.3.4' })
    }

    await expect(searchYouTube('ip novo', { ip: '9.9.9.9' })).resolves.toHaveProperty('tracks')
  })

  it('aplica rate limit por usuário (30/min)', async () => {
    const { searchYouTube, YOUTUBE_SEARCH_RATE_LIMIT_USER } = await loadService()
    mockYtApis()

    for (let i = 0; i < YOUTUBE_SEARCH_RATE_LIMIT_USER; i++) {
      await searchYouTube(`rate user ${i}`, { userId: 'user-1' })
    }

    await expect(searchYouTube('mais uma', { userId: 'user-1' })).rejects.toThrow('RATE_LIMIT_USER')
  })

  it('repete requisição em erro 5xx e retorna sucesso', async () => {
    const { searchYouTube } = await loadService()
    let searchAttempts = 0
    fetchMock.mockImplementation(async (url: string) => {
      const u = String(url)
      if (u.includes('/youtube/v3/search')) {
        searchAttempts++
        if (searchAttempts === 1) return errResponse(503)
        return okJson({ items: [searchItem], nextPageToken: null })
      }
      if (u.includes('/youtube/v3/videos')) return okJson({ items: [{ id: 'abc123', contentDetails: { duration: 'PT1M' } }] })
      return errResponse(404)
    })

    const { tracks } = await searchYouTube('retry 5xx')

    expect(tracks).toHaveLength(1)
    expect(searchAttempts).toBe(2)
  })

  it('não repete em erro 4xx', async () => {
    const { searchYouTube } = await loadService()
    fetchMock.mockResolvedValue(errResponse(403))

    await expect(searchYouTube('erro 403')).rejects.toThrow('403')
    expect(searchCallCount()).toBe(1)
  })

  it('lança erro de configuração sem YOUTUBE_API_KEY', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '')
    const { searchYouTube } = await loadService()
    mockYtApis()

    await expect(searchYouTube('sem chave')).rejects.toThrow('YOUTUBE_API_KEY not configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('pagina com pageToken pulando o cache', async () => {
    const { searchYouTube } = await loadService()
    mockYtApis()

    await searchYouTube('paginada', { pageToken: 'PAGE_1' })

    const searchCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/youtube/v3/search'))
    expect(String(searchCall?.[0])).toContain('pageToken=PAGE_1')
  })
})
