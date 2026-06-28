export interface Track {
  id: string
  name: string
  duration: number
  artist_id: string
  artist_name: string
  album_id: string
  album_name: string
  image: string
  audio: string | null
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
  image_xl: string
  followers: number
  genres: string[]
  url: string
  website: string
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
