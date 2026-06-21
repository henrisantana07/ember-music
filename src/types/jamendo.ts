export interface JamendoTrack {
  id: string
  name: string
  duration: number
  artist_id: string
  artist_name: string
  artist_idstr: string
  album_name: string
  album_id: string
  license_ccurl: string
  position: number
  releasedate: string
  album_image: string
  audio: string
  audiodownload: string
  prourl: string
  shorturl: string
  shareurl: string
  audiodownload_allowed: boolean
  image: string
}

export interface JamendoAlbum {
  id: string
  name: string
  artist_id: string
  artist_name: string
  image: string
  releasedate: string
  tracks: JamendoTrack[]
}

export interface JamendoArtist {
  id: string
  name: string
  idstr: string
  image: string
}

export interface JamendoResponse<T> {
  headers: {
    status: string
    code: number
    error_message: string
    warnings: string
    results_count: number
    next: string | null
  }
  results: T[]
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
