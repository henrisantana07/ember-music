'use client'

import { useEffect, useState } from 'react'
import type { Track } from '@/types/music'
import type { Json } from '@/types/database'
import type { User } from '@supabase/supabase-js'
import { TrendingListSkeleton } from './skeletons/TrendingListSkeleton'
import { usePlayerStore } from '@/lib/store'
import { formatDuration } from '@/lib/spotify'
import { createClient } from '@/lib/supabase/client'
import { PlaylistModal } from '@/components/PlaylistModal'

interface ExploreTrendingProps {
  userLabel: string
  userTracks: Track[]
}

function TrendingColumn({ tracks, label, subtitle }: { tracks: Track[]; label: string; subtitle: string }) {
  const { play, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null)

  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-base font-bold mb-1">{label}</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
      <div className="space-y-0.5">
        {tracks.map((track, index) => {
          const isActive = currentTrack?.id === track.id
          return (
            <div
              key={track.id}
              onClick={() => {
                if (isActive) { togglePlay(); return }
                play(track, tracks)
              }}
              className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group"
              style={{ minHeight: 52 }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 relative">
                <img src={track.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    {isActive && isPlaying ? (
                      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                    ) : (
                      <path d="M8 5v14l11-7z" />
                    )}
                  </svg>
                </div>
              </div>
              <div className="w-8 text-center flex-shrink-0 group-hover:hidden">
                <span className="text-lg font-extrabold" style={{ color: 'var(--text-disabled)' }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{track.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{track.artist_name}</p>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-disabled)' }}>
                {formatDuration(track.duration)}
              </span>
              <button onClick={(e) => { e.stopPropagation(); setPlaylistTrack(track) }} className="p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" title="Adicionar à playlist">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-disabled)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>
      {playlistTrack && (
        <PlaylistModal open={!!playlistTrack} onClose={() => setPlaylistTrack(null)} track={playlistTrack} />
      )}
    </div>
  )
}

export function ExploreTrending({ userLabel, userTracks }: ExploreTrendingProps) {
  const [globalTracks, setGlobalTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/spotify?endpoint=featured&limit=10')
      .then(res => res.json())
      .then(data => setGlobalTracks(data.results ?? []))
      .catch(() => setGlobalTracks([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section>
      <div className="flex gap-6 flex-col sm:flex-row">
        {loading ? (
          <>
            <TrendingListSkeleton />
            <TrendingListSkeleton />
          </>
        ) : (
          <>
            <TrendingColumn tracks={globalTracks.slice(0, 5)} label="Tendências Globais" subtitle="Deezer chart global" />
            <TrendingColumn tracks={userTracks.slice(0, 5)} label="Para Você" subtitle={userLabel} />
          </>
        )}
      </div>
    </section>
  )
}
