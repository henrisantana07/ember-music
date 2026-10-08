'use client'

import type { Track } from '@/types/music'
import { usePlayerStore } from '@/lib/store'
import { formatDuration } from '@/lib/spotify'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useEnsureFavorites, useFavoritesStore, useFavoritesSync } from '@/lib/favorites-store'
import { ExploreTrackSkeleton } from './skeletons/ExploreTrackSkeleton'
import { PlaylistModal } from '@/components/PlaylistModal'
import { IconButton } from '@/components/ui/IconButton'

interface TrackResultGridProps {
  tracks: Track[]
  loading?: boolean
  compact?: boolean
  maxItems?: number
}

export function TrackResultGrid({ tracks, loading, compact, maxItems }: TrackResultGridProps) {
  const { play, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const [user, setUser] = useState<User | null>(null)
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null)
  const supabase = createClient()
  const favs = useFavoritesStore((s) => s.known)
  const toggleFavorite = useFavoritesStore((s) => s.toggle)

  const displayTracks = maxItems ? tracks.slice(0, maxItems) : tracks
  useFavoritesSync(user?.id)
  useEnsureFavorites(displayTracks.map((t) => t.id))

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function handleFavorite(e: React.MouseEvent, track: Track) {
    e.stopPropagation()
    if (!user) return
    await toggleFavorite(track)
  }

  if (loading) {
    return (
      <div className={compact ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
        {Array.from({ length: maxItems ?? 6 }).map((_, i) => <ExploreTrackSkeleton key={i} compact={compact} />)}
      </div>
    )
  }

  if (displayTracks.length === 0) return null

  if (compact) {
    return (
      <div className="space-y-1">
        {displayTracks.map((track, index) => {
          const isActive = currentTrack?.id === track.id
          return (
            <div
              key={track.id}
              onClick={() => { if (isActive) togglePlay(); else play(track, tracks) }}
              className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-state-hover group"
            >
              <span className="w-6 text-center text-sm font-bold flex-shrink-0 group-hover:hidden" style={{ color: 'var(--text-disabled)' }}>{index + 1}</span>
              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 relative">
                <img src={track.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    {isActive && isPlaying ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M8 5v14l11-7z" />}
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{track.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{track.artist_name} · {formatDuration(track.duration)}</p>
              </div>
              {user && (
                <IconButton
                  size="sm"
                  label={favs[track.id] === true ? `Remover ${track.name} dos favoritos` : `Adicionar ${track.name} aos favoritos`}
                  aria-pressed={favs[track.id] === true}
                  onClick={(e) => handleFavorite(e, track)}
                  className="flex-shrink-0"
                >
                  <svg
                    className="w-4 h-4"
                    fill={favs[track.id] === true ? `url(#favRg${track.id.replace(/[^a-zA-Z0-9]/g, '')})` : 'none'}
                    viewBox="0 0 24 24"
                    stroke={favs[track.id] === true ? 'none' : 'currentColor'}
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id={`favRg${track.id.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--accent-from)" />
                        <stop offset="100%" stopColor="var(--accent-to)" />
                      </linearGradient>
                    </defs>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </IconButton>
              )}
              {user && (
                <IconButton
                  size="sm"
                  label={`Adicionar ${track.name} à playlist`}
                  onClick={(e) => { e.stopPropagation(); setPlaylistTrack(track) }}
                  className="flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </IconButton>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {displayTracks.map((track, index) => {
        const isActive = currentTrack?.id === track.id
        const isFav = favs[track.id] === true
        return (
          <div
            key={track.id}
            onClick={() => { if (isActive) togglePlay(); else play(track, tracks) }}
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-state-hover group"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 relative">
              <img src={track.image} alt="" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  {isActive && isPlaying ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M8 5v14l11-7z" />}
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{track.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{track.artist_name}</p>
              <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>{formatDuration(track.duration)}</p>
            </div>
            {user && (
              <IconButton
                size="sm"
                label={isFav ? `Remover ${track.name} dos favoritos` : `Adicionar ${track.name} aos favoritos`}
                aria-pressed={isFav}
                onClick={(e) => handleFavorite(e, track)}
                className="flex-shrink-0"
              >
                <svg
                  className="w-4 h-4"
                  fill={isFav ? `url(#favRg2${track.id.replace(/[^a-zA-Z0-9]/g, '')})` : 'none'}
                  viewBox="0 0 24 24"
                  stroke={isFav ? 'none' : 'currentColor'}
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={`favRg2${track.id.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent-from)" />
                      <stop offset="100%" stopColor="var(--accent-to)" />
                    </linearGradient>
                  </defs>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </IconButton>
            )}
            {user && (
              <IconButton
                size="sm"
                label={`Adicionar ${track.name} à playlist`}
                onClick={(e) => { e.stopPropagation(); setPlaylistTrack(track) }}
                className="flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </IconButton>
            )}
          </div>
        )
      })}
    </div>
      {playlistTrack && (
        <PlaylistModal open={!!playlistTrack} onClose={() => setPlaylistTrack(null)} track={playlistTrack} />
      )}
    </>
  )
}
