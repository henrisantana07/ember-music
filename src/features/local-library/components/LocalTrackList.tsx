'use client'

import { usePlayerStore } from '@/lib/store'
import { useLocalPlayer } from '@/features/local-library/hooks/use-local-player'
import type { LocalMusicFile } from '@/features/local-library/types'
import { formatDuration } from '@/lib/spotify'
import { TrackActionsMenu } from '@/features/local-library/components/TrackActionsMenu'

interface LocalTrackListProps {
  tracks: LocalMusicFile[]
}

export function LocalTrackList({ tracks }: LocalTrackListProps) {
  const { currentTrack, togglePlay } = usePlayerStore()
  const { playTrack } = useLocalPlayer()

  const handlePlay = (track: LocalMusicFile, allTracks: LocalMusicFile[]) => {
    const existingPlayerTrack = currentTrack?.id === track.id
    if (existingPlayerTrack) {
      togglePlay()
    } else {
      playTrack(track, allTracks)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body-medium table-fixed">
        <thead>
          <tr className="text-label-large font-semibold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
            <th className="text-right pr-3 py-3 w-14">Nº</th>
            <th className="pr-3 py-3 w-16" />
            <th className="text-left py-3">Título</th>
            <th className="text-left py-3 hidden sm:table-cell">Artista</th>
            <th className="text-left py-3 hidden md:table-cell">Álbum</th>
            <th className="text-right py-3 w-20">Duração</th>
            <th className="py-3 w-14" />
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, index) => {
            return (
              <tr
                key={track.id}
                className={`group cursor-pointer transition-colors hover:bg-state-hover ${track.missing ? 'opacity-50' : ''}`}
                onClick={() => handlePlay(track, tracks)}
              >
                <td className="text-right pr-3 py-3 text-body-medium" style={{ color: track.missing ? 'var(--error)' : 'var(--text-disabled)' }}>
                  <span className="group-hover:hidden">{track.missing ? '⚠' : index + 1}</span>
                  <span className="hidden group-hover:inline-flex h-12 w-12 items-center justify-center" style={{ color: 'var(--accent-solid)' }}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </td>
                <td className="pr-3 py-3">
                  {track.artwork ? (
                    <img src={track.artwork} alt="" className="w-14 h-14 rounded-md object-cover" loading="lazy" />
                  ) : (
                    <div className="w-14 h-14 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--text-disabled)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </td>
                <td className="py-3 font-semibold text-body-large truncate max-w-[220px]">
                  {track.title}
                  {track.inferred && (
                    <span className="ml-2 text-body-medium" style={{ color: 'var(--text-disabled)' }} title="Metadado inferido do nome do arquivo">~</span>
                  )}
                </td>
                <td className="py-3 truncate max-w-[170px] hidden sm:table-cell text-body-medium" style={{ color: 'var(--text-secondary)' }}>{track.artist}</td>
                <td className="py-3 truncate max-w-[170px] hidden md:table-cell text-body-medium" style={{ color: 'var(--text-secondary)' }}>{track.album}</td>
                <td className="text-right py-3 text-body-medium" style={{ color: 'var(--text-disabled)' }}>
                  {track.duration > 0 ? formatDuration(Math.floor(track.duration)) : '--:--'}
                </td>
                <td className="py-3 text-center">
                  <TrackActionsMenu track={track} allTracks={tracks} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}