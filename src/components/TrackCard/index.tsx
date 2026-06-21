'use client'

import type { SpotifyTrack } from '@/types/spotify'
import { formatDuration } from '@/lib/spotify'
import { usePlayerStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Json } from '@/types/database'
import { PlaylistModal } from '@/components/PlaylistModal'

interface TrackCardProps {
  track: SpotifyTrack
  tracks?: SpotifyTrack[]
}

export function TrackCard({ track, tracks }: TrackCardProps) {
  const { play, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const [isFav, setIsFav] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const supabase = createClient()

  const isActive = currentTrack?.id === track.id

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('favorites')
      .select('id')
      .eq('track_id', track.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsFav(!!data))
  }, [user, track.id])

  async function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) return
    if (isFav) {
      await supabase.from('favorites').delete().eq('track_id', track.id).eq('user_id', user.id)
      setIsFav(false)
    } else {
      await supabase.from('favorites').insert({
        user_id: user.id,
        track_id: track.id,
        track_data: track as unknown as Json,
      })
      setIsFav(true)
    }
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
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handlePlay()}
    >
      <div className="relative mb-3">
        <img
          src={track.image}
          alt={track.name}
          className="w-full aspect-square rounded-md object-cover"
          loading="lazy"
        />
        <div
          className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #FF6A0044, #FFC40044)' }}
        >
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-150 group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
          >
            {isActive && isPlaying ? (
              <svg className="w-5 h-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <h3 className="font-semibold text-sm truncate">{track.name}</h3>
      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
        {track.artist_name}
      </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
              {formatDuration(track.duration)}
            </span>
            <div className="flex items-center gap-0.5">
              {user && (
                <button onClick={(e) => { e.stopPropagation(); setPlaylistOpen(true) }} className="p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Adicionar à playlist">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-disabled)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
              {user && (
                <button onClick={handleFavorite} className="p-1">
                  <svg
                    className="w-4 h-4 transition-colors duration-150"
                    fill={isFav ? 'url(#favGradient)' : 'none'}
                    viewBox="0 0 24 24"
                    stroke={isFav ? 'none' : 'currentColor'}
                    strokeWidth={2}
                    style={isFav ? {} : { color: 'var(--text-disabled)' }}
                  >
                    <defs>
                      <linearGradient id="favGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--accent-from)" />
                        <stop offset="100%" stopColor="var(--accent-to)" />
                      </linearGradient>
                    </defs>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
    </div>
      <PlaylistModal open={playlistOpen} onClose={() => setPlaylistOpen(false)} track={track} />
    </>
  )
}
