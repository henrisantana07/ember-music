import type { JamendoResponse, JamendoTrack, JamendoAlbum, JamendoArtist, SearchFilters } from '@/types/jamendo'

const BASE_URL = 'https://api.jamendo.com/v3.0'
const CLIENT_ID = process.env.NEXT_PUBLIC_JAMENDO_CLIENT_ID!

async function fetchApi<T>(endpoint: string, params?: Record<string, string | number>): Promise<JamendoResponse<T>> {
  const url = new URL(`${BASE_URL}${endpoint}`)
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('format', 'json')
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const res = await fetch(url.toString(), { next: { revalidate: 60 } })
  if (!res.ok) {
    throw new Error(`Jamendo API error: ${res.status}`)
  }

  return res.json()
}

export async function getTracks(limit = 20, offset = 0) {
  return fetchApi<JamendoTrack>('/tracks/', { limit, offset })
}

export async function searchTracks(filters: SearchFilters) {
  const params: Record<string, string | number> = { limit: filters.limit ?? 20 }
  if (filters.search) params.search = filters.search
  if (filters.artist) params.artist = filters.artist
  if (filters.genre) {
    const genreMap: Record<string, string> = {
      rock: 'rock', pop: 'pop', jazz: 'jazz', electronic: 'electronic',
      hiphop: 'hiphop', classical: 'classical', reggae: 'reggae',
      blues: 'blues', metal: 'metal', folk: 'folk', country: 'country',
      ambient: 'ambient', soul: 'soul', funk: 'funk', indie: 'indie',
      punk: 'punk', alternative: 'alternative', latin: 'latin',
    }
    const mapped = genreMap[filters.genre.toLowerCase()]
    if (mapped) params.tags = mapped
  }
  if (filters.duration_min) params.duration_min = filters.duration_min
  if (filters.duration_max) params.duration_max = filters.duration_max
  if (filters.year_from) params.datebetween_from = `${filters.year_from}-01-01`
  if (filters.year_to) params.datebetween_to = `${filters.year_to}-12-31`
  if (filters.offset) params.offset = filters.offset

  return fetchApi<JamendoTrack>('/tracks/', params)
}

export async function getAlbums(limit = 20, offset = 0) {
  return fetchApi<JamendoAlbum>('/albums/', { limit, offset })
}

export async function getTrackById(id: string) {
  const res = await fetchApi<JamendoTrack>('/tracks/', { id, limit: 1 })
  return res.results[0] || null
}

export async function getTracksByAlbum(albumId: string) {
  return fetchApi<JamendoTrack>('/albums/tracks/', { album_id: albumId })
}

export async function getArtists(limit = 20, offset = 0) {
  return fetchApi<JamendoArtist>('/artists/', { limit, offset })
}

export function getAudioUrl(track: JamendoTrack): string {
  return track.audio
}

export function getDownloadUrl(track: JamendoTrack): string | null {
  if (track.audiodownload_allowed) {
    return track.audiodownload
  }
  return null
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
