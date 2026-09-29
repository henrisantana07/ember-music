'use client'

import { useLocalPlayer } from '@/features/local-library/hooks/use-local-player'
import { usePlayerStore } from '@/lib/store'
import type { LocalMusicFile } from '@/features/local-library/types'
import { formatDuration } from '@/lib/spotify'
import { Play, Pause, MoreVertical, Heart, Plus } from 'lucide-react'

interface LocalTrackGridProps {
  tracks: LocalMusicFile[]
}

export function LocalTrackGrid({ tracks }: LocalTrackGridProps) {
  const { currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const { playTrack } = useLocalPlayer()

  const handlePlay = (track: LocalMusicFile, allTracks: LocalMusicFile[]) => {
    const isActive = currentTrack?.id === track.id
    if (isActive) {
      togglePlay()
    } else {
      playTrack(track, allTracks)
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {tracks.map((track) => {
        const isActive = currentTrack?.id === track.id
        return (
          <div
            key={track.id}
            className={`card-hover group p-3 cursor-pointer flex flex-col ${track.missing ? 'opacity-50' : ''}`}
            onClick={() => handlePlay(track, tracks)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handlePlay(track, tracks)}
          >
            <div className="relative mb-3 aspect-square">
              {track.artwork ? (
                <img
                  src={track.artwork}
                  alt={track.title}
                  className="w-full h-full rounded-md object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--text-disabled)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div
                className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                style={{ background: 'var(--accent-overlay)' }}
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
              {track.missing && (
                <div className="absolute top-2 right-2 p-1 rounded-full" style={{ backgroundColor: 'var(--error)' }}>
                  <span className="text-[10px] font-bold" style={{ color: 'white' }}>⚠</span>
                </div>
              )}
            </div>

            <h3 className="font-semibold text-sm truncate">{track.title}</h3>
            {track.inferred && (
              <span className="text-xs mt-0.5" style={{ color: 'var(--text-disabled)' }}>Inferido do nome do arquivo</span>
            )}
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {track.artist}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-disabled)' }}>
              {track.album}
            </p>
            <div className="flex items-center justify-between mt-auto pt-2">
              <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                {track.duration > 0 ? formatDuration(Math.floor(track.duration)) : '--:--'}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1" title="Adicionar à playlist">
                  <Plus className="w-4 h-4" style={{ color: 'var(--text-disabled)' }} />
                </button>
                <button className="p-1" title="Mais opções">
                  <MoreVertical className="w-4 h-4" style={{ color: 'var(--text-disabled)' }} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}