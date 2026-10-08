'use client'

import type { Track } from '@/types/music'
import { formatDuration } from '@/lib/spotify'
import { usePlayerStore } from '@/lib/store'
import { useEnsureFavorites, useFavoritesStore, useFavoritesSync, useIsFavorite } from '@/lib/favorites-store'
import { useState } from 'react'
import { PlaylistModal } from '@/components/PlaylistModal'
import { IconButton } from '@/components/ui/IconButton'

interface TrackCardProps {
  track: Track
  tracks?: Track[]
  /** Any object with an id is enough (Supabase User or a slim session user). */
  user?: { id: string } | null
}

export function TrackCard({ track, tracks, user }: TrackCardProps) {
  const { play, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const isFav = useIsFavorite(track.id)
  const toggleFavorite = useFavoritesStore((s) => s.toggle)
  const favId = `favTc${track.id.replace(/[^a-zA-Z0-9]/g, '')}`

  const isActive = currentTrack?.id === track.id
  const isPlayingThis = isActive && isPlaying
  useFavoritesSync(user?.id)
  useEnsureFavorites([track.id])

  async function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) return
    await toggleFavorite(track)
  }

  function handlePlay() {
    if (isActive) {
      togglePlay()
    } else {
      play(track, tracks)
    }
  }

  return (
    <>
      <div
        className="card-hover group p-3 cursor-pointer flex flex-col"
        onClick={handlePlay}
      >
        <div className="relative mb-3">
          <img
            src={track.image}
            alt=""
            className="w-full aspect-square rounded-[var(--shape-medium)] object-cover"
            loading="lazy"
          />
          <div
            className="absolute inset-0 rounded-[var(--shape-medium)] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: 'var(--accent-overlay)' }}
            aria-hidden="true"
          />
          {/* Quick Play — always visible (M3 FAB), never hover-only */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handlePlay() }}
            aria-label={isPlayingThis ? `Pausar ${track.name}` : `Tocar ${track.name}`}
            aria-pressed={isPlayingThis}
            className="absolute bottom-2 right-2 w-11 h-11 rounded-full flex items-center justify-center shadow-elevation-3 transition-transform duration-150 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: isActive
                ? 'linear-gradient(135deg, var(--accent-from), var(--accent-to))'
                : 'var(--surface-container-highest)',
              color: isActive ? 'var(--bg-base)' : 'var(--accent-solid)',
              outlineColor: 'var(--accent-solid)',
            }}
          >
            {isPlayingThis ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        <h3 className={`font-semibold text-body-medium truncate ${isActive ? 'text-[var(--accent-solid)]' : ''}`}>
          {track.name}
        </h3>
        <p className="text-body-small truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {track.artist_name}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-body-small" style={{ color: 'var(--text-disabled)' }}>
            {formatDuration(track.duration)}
          </span>
          <div className="flex items-center gap-0.5">
            {user && (
              <IconButton
                size="sm"
                label={`Adicionar ${track.name} à playlist`}
                onClick={(e) => { e.stopPropagation(); setPlaylistOpen(true) }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </IconButton>
            )}
            {user && (
              <IconButton
                size="sm"
                label={isFav ? `Remover ${track.name} dos favoritos` : `Adicionar ${track.name} aos favoritos`}
                aria-pressed={isFav}
                onClick={handleFavorite}
              >
                <svg
                  className="w-4 h-4"
                  fill={isFav ? `url(#${favId})` : 'none'}
                  viewBox="0 0 24 24"
                  stroke={isFav ? 'none' : 'currentColor'}
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={favId} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent-from)" />
                      <stop offset="100%" stopColor="var(--accent-to)" />
                    </linearGradient>
                  </defs>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </IconButton>
            )}
          </div>
        </div>
      </div>
      <PlaylistModal open={playlistOpen} onClose={() => setPlaylistOpen(false)} track={track} />
    </>
  )
}
