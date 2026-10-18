import { createClient } from '@/lib/supabase/server'
import { cleanArtistName } from '@/lib/clean-title'
import type { Json } from '@/types/database'
import type { Album, Artist, Track } from '@/types/music'

export const YOUTUBE_SEARCH_CACHE_TTL = 6 * 60 * 60
export const YOUTUBE_SEARCH_DEBOUNCE_MS = 600
export const YOUTUBE_SEARCH_MAX_RESULTS = 10
export const YOUTUBE_SEARCH_RATE_LIMIT = 20
export const YOUTUBE_SEARCH_RATE_WINDOW = 60_000
export const YOUTUBE_SEARCH_RATE_LIMIT_USER = 30
export const YOUTUBE_SEARCH_MAX_RETRIES = 1

// maxResults não muda o custo (1 search.list por chamada): sempre busca o teto
// e fatia por chamada, para que sugestões e resultados dividam o mesmo cache.
const SEARCH_FETCH_TRACKS = 50
const SEARCH_FETCH_PLAYLISTS = 20
const SEARCH_FETCH_CHANNELS = 12

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

type CacheEntry = {
  results: YouTubeTrack[]
  nextPageToken: string | null
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<{ tracks: YouTubeTrack[]; nextPageToken: string | null }>>()
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const userRateLimitMap = new Map<string, { count: number; resetAt: number }>()

export interface YouTubeTrack {
  id: string
  name: string
  duration: number
  artist_id: string
  artist_name: string
  album_id: string
  album_name: string
  image: string
  audio: null
  url: string
  source: 'youtube'
  youtubeVideoId: string
  youtubeChannelId: string
  youtubeUrl: string
}

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('YOUTUBE_API_KEY not configured')
  return key
}

export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function getCacheKey(query: string): string {
  return `youtube:search:${normalizeQuery(query).replace(/\s+/g, '-')}`
}

export function getYouTubeTrackId(videoId: string): string {
  return `youtube:${videoId}`
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + YOUTUBE_SEARCH_RATE_WINDOW })
    return true
  }
  if (record.count >= YOUTUBE_SEARCH_RATE_LIMIT) return false
  record.count++
  return true
}

function checkUserRateLimit(userId: string): boolean {
  const now = Date.now()
  const record = userRateLimitMap.get(userId)
  if (!record || now > record.resetAt) {
    userRateLimitMap.set(userId, { count: 1, resetAt: now + YOUTUBE_SEARCH_RATE_WINDOW })
    return true
  }
  if (record.count >= YOUTUBE_SEARCH_RATE_LIMIT_USER) return false
  record.count++
  return true
}

function logEvent(event: string, meta?: Record<string, unknown>) {
  console.log(`[youtube.search.${event}]`, JSON.stringify(meta ?? {}))
}

async function fetchFromSupabaseCache(key: string): Promise<CacheEntry | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .rpc('youtube_cache_get', { p_key: key })
    if (error) {
      logEvent('cache_error', { key, error: error.message })
      return null
    }
    const entry = data as { results: YouTubeTrack[]; nextPageToken: string | null } | null
    if (entry && Array.isArray(entry.results)) {
      logEvent('cache_hit', { key, source: 'supabase' })
      return {
        results: entry.results,
        nextPageToken: entry.nextPageToken ?? null,
        expiresAt: Date.now() + YOUTUBE_SEARCH_CACHE_TTL * 1000,
      }
    }
  } catch (e) {
    logEvent('cache_error', { key, error: String(e) })
  }
  return null
}

async function saveToSupabaseCache(key: string, query: string, results: YouTubeTrack[], nextPageToken: string | null): Promise<void> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('youtube_cache_set', {
      p_key: key,
      p_query: query,
      p_results: results as unknown as Json,
      p_next_page_token: nextPageToken,
      p_ttl_seconds: YOUTUBE_SEARCH_CACHE_TTL,
    })
    if (error) logEvent('cache_error', { key, error: error.message })
    else logEvent('cache_miss', { key, count: results.length })
  } catch (e) {
    logEvent('cache_error', { key, error: String(e) })
  }
}

function getFromMemoryCache(key: string): CacheEntry | null {
  const entry = cache.get(key)
  if (entry && entry.expiresAt > Date.now()) return entry
  if (entry) cache.delete(key)
  return null
}

function setMemoryCache(key: string, results: YouTubeTrack[], nextPageToken: string | null): void {
  cache.set(key, { results, nextPageToken, expiresAt: Date.now() + YOUTUBE_SEARCH_CACHE_TTL * 1000 })
}

async function fetchWithRetry(url: string): Promise<Response> {
  let res = await fetch(url)
  for (let attempt = 0; res.status >= 500 && res.status < 600 && attempt < YOUTUBE_SEARCH_MAX_RETRIES; attempt++) {
    logEvent('retry', { url: url.split('?')[0], status: res.status, attempt: attempt + 1 })
    res = await fetch(url)
  }
  return res
}

async function fetchYouTubeSearch(query: string, pageToken: string | null, maxResults: number): Promise<{ items: YouTubeRawItem[]; nextPageToken: string | null }> {
  const key = getApiKey()
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    key,
  })
  if (pageToken) params.set('pageToken', pageToken)

  const res = await fetchWithRetry(`${YOUTUBE_API_BASE}/search?${params}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`YouTube search API error ${res.status}: ${body}`)
  }
  const data = await res.json()
  return { items: data.items ?? [], nextPageToken: data.nextPageToken ?? null }
}

async function fetchYouTubeVideoDetails(videoIds: string[]): Promise<Map<string, YouTubeVideoDetails>> {
  if (videoIds.length === 0) return new Map()
  const key = getApiKey()
  const params = new URLSearchParams({
    part: 'contentDetails',
    id: videoIds.join(','),
    key,
  })
  const res = await fetchWithRetry(`${YOUTUBE_API_BASE}/videos?${params}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`YouTube videos API error ${res.status}: ${body}`)
  }
  const data = await res.json()
  const map = new Map<string, YouTubeVideoDetails>()
  for (const item of data.items ?? []) {
    map.set(item.id, { duration: parseISO8601Duration(item.contentDetails?.duration ?? 'PT0S') })
  }
  return map
}

interface YouTubeRawItem {
  id: { videoId: string }
  snippet: {
    title: string
    channelId: string
    channelTitle: string
    thumbnails: { medium?: { url: string }; high?: { url: string }; default?: { url: string } }
    publishedAt: string
  }
}

interface YouTubeVideoDetails {
  duration: number
}

function parseISO8601Duration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] ?? '0', 10)
  const minutes = parseInt(match[2] ?? '0', 10)
  const seconds = parseInt(match[3] ?? '0', 10)
  return hours * 3600 + minutes * 60 + seconds
}

function mapYouTubeTrack(item: YouTubeRawItem, duration: number): YouTubeTrack {
  const videoId = item.id.videoId
  const thumb = item.snippet.thumbnails.high ?? item.snippet.thumbnails.medium ?? item.snippet.thumbnails.default
  return {
    id: getYouTubeTrackId(videoId),
    name: item.snippet.title,
    duration,
    artist_id: item.snippet.channelId,
    artist_name: item.snippet.channelTitle,
    album_id: '',
    album_name: '',
    image: thumb?.url ?? '',
    audio: null,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    source: 'youtube',
    youtubeVideoId: videoId,
    youtubeChannelId: item.snippet.channelId,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
  }
}

export async function searchYouTube(
  query: string,
  options?: { pageToken?: string; ip?: string; userId?: string; limit?: number }
): Promise<{ tracks: YouTubeTrack[]; nextPageToken: string | null }> {
  const normalized = normalizeQuery(query)
  if (!normalized) return { tracks: [], nextPageToken: null }

  if (options?.ip && !checkRateLimit(options.ip)) {
    logEvent('rate_limited', { query: normalized, ip: options.ip })
    throw new Error('RATE_LIMIT')
  }
  if (options?.userId && !checkUserRateLimit(options.userId)) {
    logEvent('rate_limited', { query: normalized, userId: options.userId })
    throw new Error('RATE_LIMIT_USER')
  }

  const requestedLimit = options?.limit && options.limit > 0 ? Math.min(options.limit, 50) : YOUTUBE_SEARCH_MAX_RESULTS
  // Cache por query (sem o limit): busca o máximo uma vez e fatia por chamada.
  const cacheKey = getCacheKey(normalized)
  const pageToken = options?.pageToken ?? null

  const memEntry = getFromMemoryCache(cacheKey)
  if (memEntry && !pageToken) {
    logEvent('cache_hit', { key: cacheKey, source: 'memory' })
    return { tracks: memEntry.results.slice(0, requestedLimit), nextPageToken: memEntry.nextPageToken }
  }

  const sbEntry = await fetchFromSupabaseCache(cacheKey)
  if (sbEntry && !pageToken) {
    setMemoryCache(cacheKey, sbEntry.results, sbEntry.nextPageToken)
    return { tracks: sbEntry.results.slice(0, requestedLimit), nextPageToken: sbEntry.nextPageToken }
  }

  const existingPromise = inFlight.get(cacheKey)
  if (existingPromise && !pageToken) {
    logEvent('dedup', { key: cacheKey })
    return existingPromise.then((entry) => ({ tracks: entry.tracks.slice(0, requestedLimit), nextPageToken: entry.nextPageToken }))
  }

  logEvent('api_request', { query: normalized })

  const promise = (async () => {
    try {
      const { items, nextPageToken } = await fetchYouTubeSearch(normalized, pageToken, SEARCH_FETCH_TRACKS)
      const videoIds = items.map(i => i.id.videoId)
      const details = await fetchYouTubeVideoDetails(videoIds)
      const tracks = items.map(item => mapYouTubeTrack(item, details.get(item.id.videoId)?.duration ?? 0))

      setMemoryCache(cacheKey, tracks, nextPageToken)
      await saveToSupabaseCache(cacheKey, normalized, tracks, nextPageToken)

      return { tracks, nextPageToken }
    } finally {
      inFlight.delete(cacheKey)
    }
  })()

  inFlight.set(cacheKey, promise)
  return promise.then((entry) => ({ tracks: entry.tracks.slice(0, requestedLimit), nextPageToken: entry.nextPageToken }))
}

export function clearRateLimits(): void {
  rateLimitMap.clear()
  userRateLimitMap.clear()
}

// ---------------------------------------------------------------------------
// Genres (curated — a YouTube Data API não expõe gêneros musicais)
// ---------------------------------------------------------------------------

export { MUSIC_GENRES } from '@/constants/genres'

// ---------------------------------------------------------------------------
// Detail/Discovery cache (memory only — protege a quota da YouTube Data API)
// ---------------------------------------------------------------------------

const detailCache = new Map<string, { value: unknown; expiresAt: number }>()
const DETAIL_TTL_MS = 30 * 60 * 1000

function detailCached<T>(key: string): T | null {
  const entry = detailCache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    detailCache.delete(key)
    return null
  }
  return entry.value as T
}

function detailSet<T>(key: string, value: T): T {
  detailCache.set(key, { value, expiresAt: Date.now() + DETAIL_TTL_MS })
  return value
}

const detailInFlight = new Map<string, Promise<unknown>>()

// Chamadas simultâneas com a mesma chave (sugestões + resultados) compartilham 1 request.
function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = detailInFlight.get(key) as Promise<T> | undefined
  if (existing) return existing
  const promise = fn().finally(() => detailInFlight.delete(key))
  detailInFlight.set(key, promise)
  return promise
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

// Resposta JSON solta da YouTube Data API (shapes variam por endpoint).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YouTubeJson = Record<string, any>

async function yt(path: string, params: Record<string, string>): Promise<YouTubeJson> {
  const key = getApiKey()
  const sp = new URLSearchParams({ ...params, key })
  const res = await fetchWithRetry(`${YOUTUBE_API_BASE}/${path}?${sp}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`YouTube API error ${res.status}: ${body}`)
  }
  return res.json()
}

function pickThumb(thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string }; maxres?: { url: string } }): string {
  return thumbnails?.maxres?.url ?? thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? ''
}

function mapChannelToArtist(item: YouTubeJson): Artist {
  return {
    id: item.id?.channelId ?? item.id ?? '',
    name: cleanArtistName(item.snippet?.title ?? ''),
    image: pickThumb(item.snippet?.thumbnails),
    image_xl: pickThumb(item.snippet?.thumbnails),
    followers: 0,
    genres: [],
    url: item.id?.channelId ? `https://www.youtube.com/channel/${item.id.channelId}` : '',
    website: '',
  }
}

function mapPlaylistToAlbum(item: YouTubeJson): Album {
  const playlistId = item.id?.playlistId ?? item.id ?? ''
  return {
    id: playlistId,
    name: item.snippet?.title ?? '',
    artist_id: item.snippet?.channelId ?? '',
    artist_name: cleanArtistName(item.snippet?.channelTitle ?? ''),
    image: pickThumb(item.snippet?.thumbnails),
    release_date: item.snippet?.publishedAt?.slice(0, 10) ?? '',
    total_tracks: item.contentDetails?.itemCount ?? 0,
    url: playlistId ? `https://www.youtube.com/playlist?list=${playlistId}` : '',
  }
}

function mapVideoItemToTrack(item: YouTubeJson, duration: number, albumId = '', albumName = ''): Track {
  const videoId = item.id?.videoId ?? item.contentDetails?.videoId ?? ''
  return {
    id: getYouTubeTrackId(videoId),
    name: item.snippet?.title ?? '',
    duration,
    artist_id: item.snippet?.channelId ?? item.snippet?.videoOwnerChannelId ?? '',
    artist_name: cleanArtistName(item.snippet?.channelTitle ?? item.snippet?.videoOwnerChannelTitle ?? ''),
    album_id: albumId,
    album_name: albumName,
    image: pickThumb(item.snippet?.thumbnails),
    audio: null,
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
    source: 'youtube',
    youtubeVideoId: videoId,
    youtubeChannelId: item.snippet?.channelId ?? item.snippet?.videoOwnerChannelId ?? '',
    youtubeUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
  }
}

// ---------------------------------------------------------------------------
// Search: channels (artistas)
// ---------------------------------------------------------------------------

async function upgradeChannelAssets(artists: Artist[]): Promise<Artist[]> {
  const ids = artists.map((a) => a.id).filter(Boolean)
  if (ids.length === 0) return artists
  try {
    const data = await yt('channels', {
      part: 'snippet,brandingSettings',
      id: ids.join(','),
      maxResults: String(ids.length),
    })
    const upgrades = new Map<string, { image: string; banner: string }>()
    for (const item of data.items ?? []) {
      const id = item?.id ?? ''
      if (!id) continue
      upgrades.set(id, {
        image: pickThumb(item.snippet?.thumbnails),
        banner: item.brandingSettings?.image?.bannerExternalUrl ?? '',
      })
    }
    if (upgrades.size === 0) return artists
    return artists.map((artist) => {
      const upgrade = upgrades.get(artist.id)
      if (!upgrade) return artist
      return {
        ...artist,
        image: upgrade.image || artist.image,
        image_xl: upgrade.banner || upgrade.image || artist.image_xl,
      }
    })
  } catch {
    return artists
  }
}

export async function searchYouTubeChannels(query: string, limit = 12): Promise<{ artists: Artist[] }> {
  const normalized = normalizeQuery(query)
  if (!normalized) return { artists: [] }
  const key = `channels:${normalizeQuery(normalized)}`
  const cached = detailCached<Artist[]>(key)
  if (cached) return { artists: cached.slice(0, limit) }

  const artists = await dedupe(key, async () => {
    const data = await yt('search', {
      part: 'snippet',
      q: normalized,
      type: 'channel',
      maxResults: String(SEARCH_FETCH_CHANNELS),
    })
    const mapped = await upgradeChannelAssets((data.items ?? []).map(mapChannelToArtist))
    return detailSet(key, mapped)
  })
  return { artists: artists.slice(0, limit) }
}

// ---------------------------------------------------------------------------
// Search: playlists (álbuns)
// ---------------------------------------------------------------------------

export async function searchYouTubePlaylists(query: string, limit = 12): Promise<{ albums: Album[] }> {
  const normalized = normalizeQuery(query)
  if (!normalized) return { albums: [] }
  const key = `playlists:${normalizeQuery(normalized)}`
  const cached = detailCached<Album[]>(key)
  if (cached) return { albums: cached.slice(0, limit) }

  const albums = await dedupe(key, async () => {
    const data = await yt('search', {
      part: 'snippet',
      q: normalized,
      type: 'playlist',
      maxResults: String(SEARCH_FETCH_PLAYLISTS),
    })
    return detailSet(key, (data.items ?? []).map(mapPlaylistToAlbum))
  })
  return { albums: albums.slice(0, limit) }
}

// ---------------------------------------------------------------------------
// Search: vídeos por canal (faixas de um artista / "relacionadas")
// ---------------------------------------------------------------------------

export async function searchYouTubeChannelVideos(
  channelId: string,
  options?: { limit?: number; exclude?: string }
): Promise<{ tracks: Track[] }> {
  if (!channelId) return { tracks: [] }
  const limit = options?.limit ?? 12
  const exclude = options?.exclude ?? ''
  const key = `channel-videos:${channelId}:${limit}:${exclude}`
  const cached = detailCached<Track[]>(key)
  if (cached) return { tracks: cached }

  const data = await yt('search', {
    part: 'snippet',
    channelId,
    type: 'video',
    maxResults: String(Math.max(limit, 1)),
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
  })
  const items: YouTubeJson[] = (data.items ?? []).filter(
    (i: YouTubeJson) => i.id?.videoId && `youtube:${i.id.videoId}` !== exclude
  )
  const videoIds = items.map((i) => i.id.videoId)
  const durations = videoIds.length ? await fetchYouTubeVideoDetails(videoIds) : new Map<string, YouTubeVideoDetails>()
  const tracks = items.map((item) => mapVideoItemToTrack(item, durations.get(item.id.videoId)?.duration ?? 0))
  return { tracks: detailSet(key, tracks) }
}

// ---------------------------------------------------------------------------
// Detalhe: álbum (playlist)
// ---------------------------------------------------------------------------

export async function getYouTubeAlbum(playlistId: string, limit = 50): Promise<{ album: Album | null; tracks: Track[] }> {
  if (!playlistId) return { album: null, tracks: [] }
  const key = `album:${playlistId}:${limit}`
  const cached = detailCached<{ album: Album | null; tracks: Track[] }>(key)
  if (cached) return cached

  const [meta, itemsData] = await Promise.all([
    yt('playlists', { part: 'snippet,contentDetails', id: playlistId }),
    yt('playlistItems', { part: 'snippet,contentDetails', playlistId, maxResults: String(Math.min(limit, 50)) }),
  ])
  const metaItem = meta.items?.[0]
  const album = metaItem ? mapPlaylistToAlbum(metaItem) : null
  const items: YouTubeJson[] = itemsData.items ?? []
  const videoIds = items.map((i) => i.contentDetails?.videoId).filter(Boolean)
  const durations = videoIds.length ? await fetchYouTubeVideoDetails(videoIds) : new Map<string, YouTubeVideoDetails>()
  const tracks = items.map((item) =>
    mapVideoItemToTrack(item, durations.get(item.contentDetails?.videoId)?.duration ?? 0, playlistId, album?.name ?? '')
  )
  return detailSet(key, { album, tracks })
}

// ---------------------------------------------------------------------------
// Detalhe: canal (artista)
// ---------------------------------------------------------------------------

export async function getYouTubeChannel(
  channelId: string,
  limit = 12
): Promise<{ artist: Artist | null; top_tracks: Track[]; albums: Album[]; related: Artist[] }> {
  if (!channelId) return { artist: null, top_tracks: [], albums: [], related: [] }
  const key = `channel:${channelId}:${limit}`
  const cached = detailCached<{ artist: Artist | null; top_tracks: Track[]; albums: Album[]; related: Artist[] }>(key)
  if (cached) return cached

  const channelData = await yt('channels', {
    part: 'snippet,contentDetails,brandingSettings',
    id: channelId,
  })
  const item = channelData.items?.[0]
  if (!item) return { artist: null, top_tracks: [], albums: [], related: [] }

  const baseArtist = mapChannelToArtist({ id: { channelId }, snippet: item.snippet })
  const banner = item.brandingSettings?.image?.bannerExternalUrl ?? ''
  const artist = banner ? { ...baseArtist, image_xl: banner } : baseArtist
  const title = item.snippet?.title ?? ''

  // Buscas secundárias são best-effort: se o bucket diário de search.list
  // esgotar, a página do artista degrada (header + listas vazias) em vez de falhar.
  const safeSearch = async (params: Record<string, string>): Promise<YouTubeJson> => {
    try {
      return await yt('search', params)
    } catch {
      return { items: [] }
    }
  }

  const [videosData, playlistsData, relatedData] = await Promise.all([
    // order=viewCount entrega as faixas mais tocadas do canal, não as mais
    // recentes — é o que a página do artista rotula como "Top Músicas".
    safeSearch({ part: 'snippet', channelId, type: 'video', maxResults: String(limit), order: 'viewCount', videoEmbeddable: 'true', videoSyndicated: 'true' }),
    safeSearch({ part: 'snippet', channelId, type: 'playlist', maxResults: String(limit) }),
    safeSearch({ part: 'snippet', q: title, type: 'channel', maxResults: String(limit) }),
  ])

  const videoItems: YouTubeJson[] = videosData.items ?? []
  const videoIds = videoItems.map((v) => v.id?.videoId).filter(Boolean)
  let durations = new Map<string, YouTubeVideoDetails>()
  if (videoIds.length) {
    try {
      durations = await fetchYouTubeVideoDetails(videoIds)
    } catch {
      // best-effort: durações vazias não impedem o playback
    }
  }
  const top_tracks = videoItems.map((v) => mapVideoItemToTrack(v, durations.get(v.id.videoId)?.duration ?? 0))

  const albums = (playlistsData.items ?? []).map(mapPlaylistToAlbum)
  const related = await upgradeChannelAssets(
    (relatedData.items ?? [])
      .map(mapChannelToArtist)
      .filter((a: Artist) => a.id !== channelId)
  )

  // Resultado degradado (buscas falharam) não vai pro cache: permite retry automático.
  const result = { artist, top_tracks, albums, related }
  if (top_tracks.length === 0 && albums.length === 0 && related.length === 0) return result
  return detailSet(key, result)
}

// ---------------------------------------------------------------------------
// Detalhe: vídeo (faixa) por id
// ---------------------------------------------------------------------------

export async function getYouTubeVideoTrack(id: string): Promise<Track | null> {
  const videoId = id.startsWith('youtube:') ? id.slice('youtube:'.length) : id
  if (!videoId) return null
  const key = `video:${videoId}`
  const cached = detailCached<Track | null>(key)
  if (cached !== null) return cached

  const data = await yt('videos', { part: 'snippet,contentDetails', id: videoId })
  const item = data.items?.[0]
  if (!item) return detailSet<Track | null>(key, null)

  const duration = parseISO8601Duration(item.contentDetails?.duration ?? 'PT0S')
  const track = mapVideoItemToTrack({ id: { videoId }, snippet: item.snippet }, duration)
  return detailSet<Track | null>(key, track)
}

// ---------------------------------------------------------------------------
// Em alta (featured / charts)
// ---------------------------------------------------------------------------

export async function getYouTubeTrending(limit = 12): Promise<{ tracks: Track[] }> {
  const key = `trending:${limit}`
  const cached = detailCached<Track[]>(key)
  if (cached) return { tracks: cached }

  const data = await yt('videos', {
    part: 'snippet,contentDetails',
    chart: 'mostPopular',
    maxResults: String(Math.min(limit, 50)),
    videoCategoryId: '10', // Música
  })
  const items: YouTubeJson[] = data.items ?? []
  const tracks = items.map((item) =>
    mapVideoItemToTrack(
      { id: { videoId: item.id }, snippet: item.snippet },
      parseISO8601Duration(item.contentDetails?.duration ?? 'PT0S')
    )
  )
  return { tracks: detailSet(key, tracks) }
}

// ---------------------------------------------------------------------------
// Faixas por gênero (busca textual — a API do YouTube não tem gêneros)
// ---------------------------------------------------------------------------

export async function searchYouTubeGenre(genreName: string, limit = 12): Promise<{ tracks: Track[] }> {
  const normalized = normalizeQuery(`${genreName} music`)
  if (!normalized) return { tracks: [] }
  const key = `genre-tracks:${normalizeQuery(genreName)}:${limit}`
  const cached = detailCached<Track[]>(key)
  if (cached) return { tracks: cached }

  const data = await yt('search', {
    part: 'snippet',
    q: normalized,
    type: 'video',
    maxResults: String(limit),
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
  })
  const items: YouTubeJson[] = data.items ?? []
  const videoIds = items.map((i) => i.id?.videoId).filter(Boolean)
  const durations = videoIds.length ? await fetchYouTubeVideoDetails(videoIds) : new Map<string, YouTubeVideoDetails>()
  const tracks = items.map((item) => mapVideoItemToTrack(item, durations.get(item.id.videoId)?.duration ?? 0))
  return { tracks: detailSet(key, tracks) }
}