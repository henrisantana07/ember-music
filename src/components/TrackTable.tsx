'use client'

import type { Track } from '@/types/music'
import { usePlayerStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Json } from '@/types/database'
import { PlaylistModal } from '@/components/PlaylistModal'

interface TrackTableProps {
  tracks: Track[]
  user?: User | null
}

export function TrackTable({ tracks, user }: TrackTableProps) {
  const { play, currentTrack, togglePlay } = usePlayerStore()
  const [favs, setFavs] = useState<Set<string>>(new Set())
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!user) { setFavs(new Set()); return }
    const ids = tracks.map(t => t.id).filter(Boolean)
    if (ids.length === 0) return
    supabase.from('favorites').select('track_id').eq('user_id', user.id).in('track_id', ids)
      .then(({ data }) => setFavs(new Set(data?.map(d => d.track_id) ?? [])))
  }, [user, tracks])

  async function handleFavorite(e: React.MouseEvent, track: Track) {
    e.stopPropagation()
    if (!user) return
    if (favs.has(track.id)) {
      const { error } = await supabase.from('favorites').delete().eq('track_id', track.id).eq('user_id', user.id)
      if (!error) {
        setFavs(prev => { const n = new Set(prev); n.delete(track.id); return n })
      }
    } else {
      const { error } = await supabase.from('favorites').insert({ user_id: user.id, track_id: track.id, track_data: track as unknown as Json })
      if (!error) {
        setFavs(prev => { const n = new Set(prev); n.add(track.id); return n })
      }
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
              <th className="text-right pr-3 py-2 w-10">Nº</th>
              <th className="pr-3 py-2 w-12" />
              <th className="text-left py-2">Título</th>
              <th className="text-left py-2 hidden sm:table-cell">Artista</th>
              <th className="text-left py-2 hidden md:table-cell">Álbum</th>
              <th className="text-right py-2 w-16">Duração</th>
              <th className="py-2 w-10" />
              <th className="py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {tracks.map((track, index) => {
              const isActive = currentTrack?.id === track.id
              return (
                <tr
                  key={track.id}
                  className="group cursor-pointer transition-colors hover:bg-white/5"
                  onClick={() => { if (isActive) togglePlay(); else play(track, tracks) }}
                >
                  <td className="text-right pr-3 py-2 text-sm" style={{ color: 'var(--text-disabled)' }}>
                    <span className="group-hover:hidden">{index + 1}</span>
                    <span className="hidden group-hover:inline" style={{ color: 'var(--accent-solid)' }}>
                      <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </td>
                  <td className="pr-3 py-2">
                    <img src={track.image} alt="" className="w-12 h-12 rounded-md object-cover" loading="lazy" />
                  </td>
                  <td className="py-2 font-medium truncate max-w-[200px]">{track.name}</td>
                  <td className="py-2 truncate max-w-[150px] hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{track.artist_name}</td>
                  <td className="py-2 truncate max-w-[150px] hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>{track.album_name}</td>
                  <td className="text-right py-2" style={{ color: 'var(--text-disabled)' }}>
                    {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                  </td>
                  <td className="py-2 text-center">
                    {user && (
                      <button onClick={(e) => handleFavorite(e, track)} className="p-1">
                        <svg
                          className="w-4 h-4 transition-colors duration-150"
                          fill={favs.has(track.id) ? `url(#favTb${track.id.replace(/[^a-zA-Z0-9]/g, '')})` : 'none'}
                          viewBox="0 0 24 24"
                          stroke={favs.has(track.id) ? 'none' : 'currentColor'}
                          strokeWidth={2}
                          style={favs.has(track.id) ? {} : { color: 'var(--text-disabled)' }}
                        >
                          <defs>
                            <linearGradient id={`favTb${track.id.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="var(--accent-from)" />
                              <stop offset="100%" stopColor="var(--accent-to)" />
                            </linearGradient>
                          </defs>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    )}
                  </td>
                  <td className="py-2 text-center">
                    {user && (
                      <button onClick={(e) => { e.stopPropagation(); setPlaylistTrack(track) }} className="p-1" title="Adicionar à playlist">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-disabled)' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {playlistTrack && (
        <PlaylistModal open={!!playlistTrack} onClose={() => setPlaylistTrack(null)} track={playlistTrack} />
      )}
    </>
  )
}
