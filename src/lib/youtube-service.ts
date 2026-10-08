import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export const YOUTUBE_SEARCH_CACHE_TTL = 6 * 60 * 60
export const YOUTUBE_SEARCH_DEBOUNCE_MS = 600
export const YOUTUBE_SEARCH_MAX_RESULTS = 10
export const YOUTUBE_SEARCH_RATE_LIMIT = 20
export const YOUTUBE_SEARCH_RATE_WINDOW = 60_000
export const YOUTUBE_SEARCH_RATE_LIMIT_USER = 30
export const YOUTUBE_SEARCH_MAX_RETRIES = 1

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

async function fetchYouTubeSearch(query: string, pageToken: string | null): Promise<{ items: YouTubeRawItem[]; nextPageToken: string | null }> {
  const key = getApiKey()
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(YOUTUBE_SEARCH_MAX_RESULTS),
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
  options?: { pageToken?: string; ip?: string; userId?: string }
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

  const cacheKey = getCacheKey(normalized)
  const pageToken = options?.pageToken ?? null

  const memEntry = getFromMemoryCache(cacheKey)
  if (memEntry && !pageToken) {
    logEvent('cache_hit', { key: cacheKey, source: 'memory' })
    return { tracks: memEntry.results, nextPageToken: memEntry.nextPageToken }
  }

  const sbEntry = await fetchFromSupabaseCache(cacheKey)
  if (sbEntry && !pageToken) {
    setMemoryCache(cacheKey, sbEntry.results, sbEntry.nextPageToken)
    return { tracks: sbEntry.results, nextPageToken: sbEntry.nextPageToken }
  }

  const existingPromise = inFlight.get(cacheKey)
  if (existingPromise && !pageToken) {
    logEvent('dedup', { key: cacheKey })
    return existingPromise
  }

  logEvent('api_request', { query: normalized })

  const promise = (async () => {
    try {
      const { items, nextPageToken } = await fetchYouTubeSearch(normalized, pageToken)
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
  return promise
}

export function clearRateLimits(): void {
  rateLimitMap.clear()
  userRateLimitMap.clear()
}