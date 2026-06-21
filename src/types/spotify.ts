export interface SpotifyTrack {
  id: string
  name: string
  duration: number
  artist_id: string
  artist_name: string
  album_id: string
  album_name: string
  image: string
  audio: string | null
  spotify_url: string
}

export interface SpotifyAlbum {
  id: string
  name: string
  artist_id: string
  artist_name: string
  image: string
  release_date: string
  total_tracks: number
  spotify_url: string
}

export interface SpotifyArtist {
  id: string
  name: string
  image: string
  followers: number
  genres: string[]
  spotify_url: string
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string
  image: string
  owner: string
  tracks_total: number
  spotify_url: string
}

export interface SpotifySearchResult {
  tracks: SpotifyTrack[]
  albums: SpotifyAlbum[]
  artists: SpotifyArtist[]
  playlists: SpotifyPlaylist[]
}

export interface SpotifyImage {
  url: string
  height: number
  width: number
}

export interface SpotifyArtistRaw {
  id: string
  name: string
  images: SpotifyImage[]
  genres: string[]
  followers: { total: number }
  external_urls: { spotify: string }
}

export interface SpotifyAlbumRaw {
  id: string
  name: string
  artists: { id: string; name: string }[]
  images: SpotifyImage[]
  release_date: string
  total_tracks: number
  external_urls: { spotify: string }
}

export interface SpotifyTrackRaw {
  id: string
  name: string
  duration_ms: number
  artists: { id: string; name: string }[]
  album: SpotifyAlbumRaw
  preview_url: string | null
  external_urls: { spotify: string }
}

export interface SpotifyPlaylistRaw {
  id: string
  name: string
  description: string
  images: SpotifyImage[]
  owner: { display_name: string }
  tracks: { total: number }
  external_urls: { spotify: string }
}
