'use client'

import type { Track } from '@/types/music'
import { usePlayerStore } from '@/lib/store'
import { formatDuration } from '@/lib/spotify'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Json } from '@/types/database'
import { PlaylistModal } from '@/components/PlaylistModal'

interface TopResultCardProps {
  track: Track
}

export function TopResultCard({ track }: TopResultCardProps) {
  const { play, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const [user, setUser] = useState<User | null>(null)
  const [isFav, setIsFav] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const supabase = createClient()

  const isActive = currentTrack?.id === track.id

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    if (!user) return
    supabase.from('favorites').select('id').eq('track_id', track.id).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setIsFav(!!data))
  }, [user, track.id])

  async function handleFavorite() {
    if (!user) return
    if (isFav) {
      await supabase.from('favorites').delete().eq('track_id', track.id).eq('user_id', user.id)
      setIsFav(false)
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, track_id: track.id, track_data: track as unknown as Json })
      setIsFav(true)
    }
  }

  return (
    <>
      <div
        className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.03]"
        style={{ backgroundColor: 'var(--bg-surface)', borderLeft: '4px solid', borderImage: 'linear-gradient(135deg, var(--accent-from), var(--accent-to)) 1' }}
        onClick={() => { if (isActive) togglePlay(); else play(track) }}
      >
        <img src={track.image} alt={track.name} className="w-[120px] h-[120px] rounded-lg object-cover flex-shrink-0" loading="lazy" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>
            Resultado principal
          </p>
          <h3 className="text-xl font-bold truncate mb-1">{track.name}</h3>
          <p className="text-sm truncate mb-3" style={{ color: 'var(--text-secondary)' }}>
            {track.artist_name} · {track.album_name} · {formatDuration(track.duration)}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); if (isActive) togglePlay(); else play(track) }}
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
            >
              {isActive && isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
              {isActive && isPlaying ? 'Pausar' : 'Tocar'}
            </button>
            {user && (
              <button onClick={(e) => { e.stopPropagation(); handleFavorite() }} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <svg className="w-5 h-5" fill={isFav ? 'url(#favGradientTop)' : 'none'} viewBox="0 0 24 24" stroke={isFav ? 'none' : 'currentColor'} strokeWidth={2} style={{ color: 'var(--text-disabled)' }}>
                  <defs><linearGradient id="favGradientTop" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="var(--accent-from)" /><stop offset="100%" stopColor="var(--accent-to)" /></linearGradient></defs>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }} className="p-2 rounded-full hover:bg-white/10 transition-colors" style={{ color: 'var(--text-disabled)' }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
            </button>
            {menuOpen && (
              <div className="relative">
                <div className="absolute right-0 top-0 mt-8 w-36 rounded-lg shadow-lg py-1 z-50" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <button onClick={(e) => { e.stopPropagation(); setPlaylistOpen(true); setMenuOpen(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>Adicionar à playlist</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <PlaylistModal open={playlistOpen} onClose={() => setPlaylistOpen(false)} track={track} />
    </>
  )
}
