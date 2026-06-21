import type { SpotifyTrack } from '@/types/spotify'

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function getTrackUrl(track: SpotifyTrack): string | null {
  return track.audio
}

export function openSpotify(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
