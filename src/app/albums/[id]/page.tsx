'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ShareButton } from '@/components/ShareButton'
import { SaveAlbumButton } from '@/components/SaveAlbumButton'
import { PlaylistModal } from '@/components/PlaylistModal'
import { usePlayerStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import type { Track, Album } from '@/types/music'
import type { Json } from '@/types/database'

export default function AlbumPage() {
  const params = useParams()
  const albumId = params.id as string
  const [album, setAlbum] = useState<{
    id: string; name: string; image: string; artist_name: string; artist_id: string
    release_date: string; tracks: Track[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [favs, setFavs] = useState<Set<string>>(new Set())
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null)
  const play = usePlayerStore((s) => s.play)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    if (!user || !album) { setFavs(new Set()); return }
    const ids = album.tracks.map(t => t.id)
    if (ids.length === 0) return
    supabase.from('favorites').select('track_id').eq('user_id', user.id).in('track_id', ids)
      .then(({ data }) => setFavs(new Set(data?.map(d => d.track_id) ?? [])))
  }, [user, album])

  async function handleFavorite(e: React.MouseEvent, track: Track) {
    e.stopPropagation()
    if (!user) return
    if (favs.has(track.id)) {
      await supabase.from('favorites').delete().eq('track_id', track.id).eq('user_id', user.id)
      setFavs(prev => { const n = new Set(prev); n.delete(track.id); return n })
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, track_id: track.id, track_data: track as unknown as Json })
      setFavs(prev => { const n = new Set(prev); n.add(track.id); return n })
    }
  }

  useEffect(() => {
    fetch(`/api/spotify?endpoint=albums&id=${albumId}`).then((r) => r.json()).then((albumRes) => {
      const a = albumRes?.album ?? albumRes?.results?.[0]
      if (!a) { setLoading(false); return }
      setAlbum({
        id: a.id,
        name: a.name,
        image: a.image,
        artist_name: a.artist_name,
        artist_id: a.artist_id,
        release_date: a.release_date,
        tracks: albumRes?.tracks ?? [],
      })
      setLoading(false)
    })
  }, [albumId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!album) return <div className="py-20 text-center" style={{ color: 'var(--text-secondary)' }}>Álbum não encontrado</div>

  const durationTotal = album.tracks.reduce((acc, t) => acc + (t.duration || 0), 0)
  const minutes = Math.floor(durationTotal / 60)

  return (
    <div className="mx-auto w-full px-4 md:px-8" style={{ maxWidth: 1100 }}>
      <div className="flex items-end gap-6 mb-8 p-6 rounded-2xl" style={{ background: 'var(--bg-elevated)' }}>
        <img src={album.image || '/placeholder.svg'} alt={album.name}
          className="w-48 h-48 rounded-xl object-cover shadow-lg" />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Álbum</p>
          <h1 className="text-3xl font-bold mb-2 truncate">{album.name}</h1>
          <a href={`/artists/${album.artist_id}`} className="text-sm font-semibold hover:underline" style={{ color: 'var(--text-primary)' }}>
            {album.artist_name}
          </a>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {album.release_date?.slice(0, 4)} &middot; {album.tracks.length} músicas &middot; {minutes} min
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => album.tracks.length > 0 && play(album.tracks, 0)}
              className="px-6 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(to right, var(--accent-from), var(--accent-to))', color: '#fff' }}
            >
              Tocar tudo
            </button>
            {user && (
              <SaveAlbumButton album={album as unknown as Album} />
            )}
            <ShareButton title={album.name} text={`Ouça o álbum "${album.name}" de ${album.artist_name} no Ember Music`} variant="full" />
          </div>
        </div>
      </div>

      <div className="rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
        {album.tracks.map((track, i) => (
          <div key={track.id}
            onClick={() => play(album.tracks, i)}
            className="flex items-center gap-4 px-4 py-2.5 cursor-pointer transition-colors hover:bg-white/5 group"
          >
            <span className="w-8 text-right text-sm font-mono" style={{ color: 'var(--text-disabled)' }}>{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{track.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{track.artist_name}</p>
            </div>
            <span className="text-xs font-mono" style={{ color: 'var(--text-disabled)' }}>
              {Math.floor((track.duration || 0) / 60)}:{String(Math.floor((track.duration || 0) % 60)).padStart(2, '0')}
            </span>
            {user && (
              <button onClick={(e) => handleFavorite(e, track)} className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  className="w-4 h-4 transition-colors duration-150"
                  fill={favs.has(track.id) ? `url(#favAb${track.id.replace(/[^a-zA-Z0-9]/g, '')})` : 'none'}
                  viewBox="0 0 24 24"
                  stroke={favs.has(track.id) ? 'none' : 'currentColor'}
                  strokeWidth={2}
                  style={favs.has(track.id) ? {} : { color: 'var(--text-disabled)' }}
                >
                  <defs>
                    <linearGradient id={`favAb${track.id.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent-from)" />
                      <stop offset="100%" stopColor="var(--accent-to)" />
                    </linearGradient>
                  </defs>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            )}
            {user && (
              <button onClick={(e) => { e.stopPropagation(); setPlaylistTrack(track) }} className="p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Adicionar à playlist">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-disabled)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      {playlistTrack && (
        <PlaylistModal open={!!playlistTrack} onClose={() => setPlaylistTrack(null)} track={playlistTrack} />
      )}
    </div>
  )
}
