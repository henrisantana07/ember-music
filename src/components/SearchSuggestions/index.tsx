'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerStore } from '@/lib/store'
import type { Track, Album, Artist } from '@/types/music'

interface SearchSuggestionsProps {
  query: string
  onSelect: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
  visible: boolean
}

export function SearchSuggestions({ query, onSelect, inputRef, visible }: SearchSuggestionsProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const panelRef = useRef<HTMLDivElement>(null)
  const activeQueryRef = useRef('')

  const flatItems = useCallback(() => {
    const items: ({ type: 'track' } & Track)[] = tracks.map((t) => ({ ...t, type: 'track' as const }))
    return items
  }, [tracks])

  useEffect(() => {
    if (query.length < 2 || !visible) {
      setTracks([])
      setAlbums([])
      setArtists([])
      return
    }

    setLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q = query
    activeQueryRef.current = q

    debounceRef.current = setTimeout(async () => {
      try {
        const [trackRes, albumRes, artistRes] = await Promise.all([
          fetch(`/api/spotify?endpoint=search&q=${encodeURIComponent(q)}&type=track&limit=4`),
          fetch(`/api/spotify?endpoint=search&q=${encodeURIComponent(q)}&type=album&limit=2`),
          fetch(`/api/spotify?endpoint=search&q=${encodeURIComponent(q)}&type=artist&limit=2`),
        ])

        if (activeQueryRef.current !== q) return

        if (trackRes.ok) {
          const data = await trackRes.json()
          setTracks(data.tracks ?? [])
        }
        if (albumRes.ok) {
          const data = await albumRes.json()
          setAlbums(data.albums ?? [])
        }
        if (artistRes.ok) {
          const data = await artistRes.json()
          setArtists(data.artists ?? [])
        }
        setSelectedIndex(-1)
      } catch {
        setTracks([])
        setAlbums([])
        setArtists([])
      } finally {
        if (activeQueryRef.current === q) {
          setLoading(false)
        }
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, visible])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setTracks([])
        setAlbums([])
        setArtists([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [inputRef])

  const items = flatItems()
  const totalItems = items.length

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!visible || query.length < 2) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (totalItems === 0) return
        setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (totalItems === 0) return
        setSelectedIndex((prev) => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < totalItems) {
          onSelect()
          setTracks([])
          setAlbums([])
          setArtists([])
          const { play } = usePlayerStore.getState()
          if (typeof play === 'function') {
            play(items[selectedIndex], tracks)
          }
        } else {
          onSelect()
          router.push(`/?q=${encodeURIComponent(query)}`)
        }
        break
      case 'Escape':
        setTracks([])
        setAlbums([])
        setArtists([])
        break
    }
  }, [items, totalItems, selectedIndex, onSelect, query, router, visible, tracks])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    setSelectedIndex(-1)
  }, [tracks, albums, artists])

  function playTrack(track: Track) {
    onSelect()
    setTracks([])
    setAlbums([])
    setArtists([])
    const { play } = usePlayerStore.getState()
    if (typeof play === 'function') {
      play(track, tracks)
    }
  }

  function navigateTo(path: string) {
    onSelect()
    setTracks([])
    setAlbums([])
    setArtists([])
    router.push(path)
  }

  const hasResults = tracks.length > 0 || albums.length > 0 || artists.length > 0

  if (!visible || query.length < 2 || (!loading && !hasResults)) return null

  return (
    <div
      ref={panelRef}
      className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {loading && (
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }} />
          <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>Buscando...</span>
        </div>
      )}

      {tracks.length > 0 && (
        <>
          <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
            Músicas
          </div>
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => playTrack(track)}
              className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
              style={{
                backgroundColor: items.indexOf(track as any) === selectedIndex ? 'var(--bg-elevated)' : 'transparent',
              }}
              onMouseEnter={() => setSelectedIndex(items.indexOf(track as any))}
            >
              <div className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                {track.image ? (
                  <img src={track.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-disabled)' }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{track.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{track.artist_name}</p>
              </div>
            </button>
          ))}
        </>
      )}

      {albums.length > 0 && (
        <>
          <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
            Álbuns
          </div>
          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => navigateTo(`/albums/${album.id}`)}
              className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
            >
              <div className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                {album.image ? (
                  <img src={album.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-disabled)' }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{album.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{album.artist_name}</p>
              </div>
            </button>
          ))}
        </>
      )}

      {artists.length > 0 && (
        <>
          <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
            Artistas
          </div>
          {artists.map((artist) => (
            <button
              key={artist.id}
              onClick={() => navigateTo(`/artists/${artist.id}`)}
              className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
            >
              <div className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                {artist.image ? (
                  <img src={artist.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-disabled)' }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{artist.name}</p>
              </div>
            </button>
          ))}
        </>
      )}

      <div
        className="px-4 py-2 text-xs border-t flex items-center justify-between"
        style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-disabled)' }}
      >
        <span>Resultados para &ldquo;{query}&rdquo;</span>
        <button
          onClick={() => navigateTo(`/?q=${encodeURIComponent(query)}`)}
          className="font-medium"
          style={{ color: 'var(--accent-solid)' }}
        >
          Ver todos
        </button>
      </div>
    </div>
  )
}
