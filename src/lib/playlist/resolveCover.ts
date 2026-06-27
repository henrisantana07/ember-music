export type CoverSource = 'custom' | 'track' | 'branded'

export interface PlaylistCover {
  source: CoverSource
  url: string | null
}

export function resolveCover(playlist: {
  cover_source: CoverSource
  custom_cover_url: string | null
  last_track_cover_url: string | null
}): PlaylistCover {
  switch (playlist.cover_source) {
    case 'custom':
      return { source: 'custom', url: playlist.custom_cover_url }
    case 'track':
      return { source: 'track', url: playlist.last_track_cover_url }
    case 'branded':
    default:
      return { source: 'branded', url: null }
  }
}
