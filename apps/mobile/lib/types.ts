export interface Track {
  id: string
  name: string
  duration: number
  artist_id: string
  artist_name: string
  album_id: string
  album_name: string
  image: string
  audio: string
  url: string
}

export interface Album {
  id: string
  name: string
  artist_id: string
  artist_name: string
  image: string
  release_date: string
  total_tracks: number
  url: string
}

export interface Artist {
  id: string
  name: string
  image: string
  followers: number
  genres: string[]
  url: string
}

export interface Genre {
  id: string
  name: string
  image: string
}

export interface Playlist {
  id: string
  name: string
  description: string
  image: string
  owner: string
  tracks_total: number
  url: string
}

export interface SearchResult {
  tracks: Track[]
  albums: Album[]
  artists: Artist[]
  playlists: Playlist[]
}

export interface SearchFilters {
  search?: string
  genre?: string
  artist?: string
  duration_min?: number
  duration_max?: number
  year_from?: number
  year_to?: number
  limit?: number
  offset?: number
}

export type RepeatMode = 'none' | 'one' | 'all'

export interface QueueTrack extends Track {
  queuedAt?: number
}
