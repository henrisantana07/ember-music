import type { Track, Album, Artist, Genre, Playlist, SearchFilters, SearchResult } from '@embermusic/types'

const DEEZER_API = 'https://api.deezer.com'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Deezer API error: ${res.status}`)
  return res.json()
}

function mapTrack(item: any): Track {
  return {
    id: String(item.id),
    name: item.title,
    duration: item.duration,
    artist_id: String(item.artist?.id || ''),
    artist_name: item.artist?.name || '',
    album_id: String(item.album?.id || ''),
    album_name: item.album?.title || '',
    image: item.album?.cover_medium || item.album?.cover || '',
    audio: item.preview || '',
    url: item.link || '',
  }
}

function mapAlbum(item: any): Album {
  return {
    id: String(item.id),
    name: item.title,
    artist_id: String(item.artist?.id || ''),
    artist_name: item.artist?.name || '',
    image: item.cover_medium || item.cover || '',
    release_date: item.release_date || '',
    total_tracks: item.nb_tracks || 0,
    url: item.link || '',
  }
}

function mapArtist(item: any): Artist {
  return {
    id: String(item.id),
    name: item.name,
    image: item.picture_medium || item.picture || '',
    followers: item.nb_fan || 0,
    genres: [],
    url: item.link || '',
  }
}

function mapGenre(item: any): Genre {
  return {
    id: String(item.id),
    name: item.name,
    image: item.picture_medium || item.picture || '',
  }
}

function mapPlaylist(item: any): Playlist {
  return {
    id: String(item.id),
    name: item.title,
    description: item.description || '',
    image: item.picture_medium || item.picture || '',
    owner: item.creator?.name || '',
    tracks_total: item.nb_tracks || 0,
    url: item.link || '',
  }
}

export async function searchTracks(query: string, limit = 20): Promise<Track[]> {
  const data = await fetchJson<any>(`${DEEZER_API}/search/track?q=${encodeURIComponent(query)}&limit=${limit}`)
  return (data.data || []).map(mapTrack)
}

export async function searchAlbums(query: string, limit = 10): Promise<Album[]> {
  const data = await fetchJson<any>(`${DEEZER_API}/search/album?q=${encodeURIComponent(query)}&limit=${limit}`)
  return (data.data || []).map(mapAlbum)
}

export async function searchArtists(query: string, limit = 10): Promise<Artist[]> {
  const data = await fetchJson<any>(`${DEEZER_API}/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`)
  return (data.data || []).map(mapArtist)
}

export async function searchAll(query: string, limit = 5): Promise<SearchResult> {
  const [tracks, albums, artists] = await Promise.all([
    searchTracks(query, limit),
    searchAlbums(query, Math.min(limit, 3)),
    searchArtists(query, Math.min(limit, 3)),
  ])
  return { tracks, albums, artists, playlists: [] }
}

export async function getTrack(id: string): Promise<Track | null> {
  try {
    const data = await fetchJson<any>(`${DEEZER_API}/track/${id}`)
    return mapTrack(data)
  } catch { return null }
}

export async function getAlbum(id: string): Promise<{ album: Album; tracks: Track[] } | null> {
  try {
    const data = await fetchJson<any>(`${DEEZER_API}/album/${id}`)
    return {
      album: mapAlbum(data),
      tracks: (data.tracks?.data || data.tracks || []).map(mapTrack),
    }
  } catch { return null }
}

export async function getArtist(id: string): Promise<Artist | null> {
  try {
    const data = await fetchJson<any>(`${DEEZER_API}/artist/${id}`)
    return mapArtist(data)
  } catch { return null }
}

export async function getArtistTopTracks(id: string, limit = 10): Promise<Track[]> {
  try {
    const data = await fetchJson<any>(`${DEEZER_API}/artist/${id}/top?limit=${limit}`)
    return (data.data || []).map(mapTrack)
  } catch { return [] }
}

export async function getChartTracks(limit = 20): Promise<Track[]> {
  const data = await fetchJson<any>(`${DEEZER_API}/chart/0/tracks?limit=${limit}`)
  return (data.data || []).map(mapTrack)
}

export async function getChartAlbums(limit = 10): Promise<Album[]> {
  const data = await fetchJson<any>(`${DEEZER_API}/chart/0/albums?limit=${limit}`)
  return (data.data || []).map(mapAlbum)
}

export async function getChartArtists(limit = 10): Promise<Artist[]> {
  const data = await fetchJson<any>(`${DEEZER_API}/chart/0/artists?limit=${limit}`)
  return (data.data || []).map(mapArtist)
}

export async function getGenres(): Promise<Genre[]> {
  const data = await fetchJson<any>(`${DEEZER_API}/genre`)
  return (data.data || []).map(mapGenre)
}

export async function getGenreTracks(genreId: string, limit = 20): Promise<Track[]> {
  const data = await fetchJson<any>(`${DEEZER_API}/genre/${genreId}/tracks?limit=${limit}`)
  return (data.data || []).map(mapTrack)
}

export async function getArtistAlbums(id: string, limit = 10): Promise<Album[]> {
  try {
    const data = await fetchJson<any>(`${DEEZER_API}/artist/${id}/albums?limit=${limit}`)
    return (data.data || []).map(mapAlbum)
  } catch { return [] }
}
