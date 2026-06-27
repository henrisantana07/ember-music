'use client'

import type { Track } from '@/types/music'
import { usePlayerStore } from '@/lib/store'
import { formatDuration } from '@/lib/spotify'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Json } from '@/types/database'
import { ExploreTrackSkeleton } from './skeletons/ExploreTrackSkeleton'

interface TrackResultGridProps {
  tracks: Track[]
  loading?: boolean
  compact?: boolean
  maxItems?: number
}

export function TrackResultGrid({ tracks, loading, compact, maxItems }: TrackResultGridProps) {
  const { play, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const displayTracks = maxItems ? tracks.slice(0, maxItems) : tracks

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
              className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/5 group"
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
              <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-disabled)' }}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {displayTracks.map((track, index) => {
        const isActive = currentTrack?.id === track.id
        return (
          <div
            key={track.id}
            onClick={() => { if (isActive) togglePlay(); else play(track, tracks) }}
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-white/5 group"
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
            <button className="p-1 flex-shrink-0" style={{ color: 'var(--text-disabled)' }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
