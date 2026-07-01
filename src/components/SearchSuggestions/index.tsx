'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { usePlayerStore } from '@/lib/store'
import {
  clearSearchHistory,
  deleteSearchHistoryItem,
  getSearchHistory,
  type SearchHistoryItem,
} from '@/lib/search-history'
import type { Album, Artist, Track } from '@/types/music'

interface SearchSuggestionsProps {
  query: string
  onSelect: () => void
  onClose: () => void
  onSearch: (query: string) => void
  inputRef: RefObject<HTMLInputElement | null>
  visible: boolean
  user: User | null
}

type SuggestionItem =
  | { type: 'track'; track: Track }
  | { type: 'album'; album: Album }
  | { type: 'artist'; artist: Artist }
  | { type: 'history'; history: SearchHistoryItem }

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function SearchSuggestions({ query, onSelect, onClose, onSearch, inputRef, visible, user }: SearchSuggestionsProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const cleanQuery = normalizeQuery(query)

  const items = useMemo<SuggestionItem[]>(() => {
    if (cleanQuery.length < 2) return history.map((item) => ({ type: 'history', history: item }))
    return [
      ...tracks.map((track) => ({ type: 'track' as const, track })),
      ...artists.map((artist) => ({ type: 'artist' as const, artist })),
      ...albums.map((album) => ({ type: 'album' as const, album })),
    ]
  }, [albums, artists, cleanQuery.length, history, tracks])

  useEffect(() => {
    if (!visible || cleanQuery.length >= 2) return
    void getSearchHistory(user).then(setHistory)
  }, [cleanQuery.length, user, visible])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    if (!visible || cleanQuery.length < 2) {
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const encoded = encodeURIComponent(cleanQuery)
        const [trackRes, albumRes, artistRes] = await Promise.all([
          fetch(`/api/deezer?endpoint=search&q=${encoded}&type=track&limit=4`, { signal: controller.signal }),
          fetch(`/api/deezer?endpoint=search&q=${encoded}&type=album&limit=3`, { signal: controller.signal }),
          fetch(`/api/deezer?endpoint=search&q=${encoded}&type=artist&limit=3`, { signal: controller.signal }),
        ])

        const [trackData, albumData, artistData] = await Promise.all([
          trackRes.ok ? trackRes.json() : Promise.resolve({ tracks: [] }),
          albumRes.ok ? albumRes.json() : Promise.resolve({ albums: [] }),
          artistRes.ok ? artistRes.json() : Promise.resolve({ artists: [] }),
        ])

        setTracks(trackData.tracks ?? [])
        setAlbums(albumData.albums ?? [])
        setArtists(artistData.artists ?? [])
        setSelectedIndex(-1)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setTracks([])
          setAlbums([])
          setArtists([])
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      controller.abort()
    }
  }, [cleanQuery, visible])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [inputRef, onClose])

  const selectItem = useCallback((item: SuggestionItem) => {
    if (item.type === 'track') {
      usePlayerStore.getState().play(item.track, tracks)
      onSelect()
      return
    }
    if (item.type === 'artist') {
      onSelect()
      router.push(`/artists/${item.artist.id}`)
      return
    }
    if (item.type === 'album') {
      onSelect()
      router.push(`/albums/${item.album.id}`)
      return
    }
    onSearch(item.history.query)
  }, [onSearch, onSelect, router, tracks])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!visible) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, -1))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex >= 0 && items[selectedIndex]) selectItem(items[selectedIndex])
        else if (cleanQuery) onSearch(cleanQuery)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [cleanQuery, items, onClose, onSearch, selectItem, selectedIndex, visible])

  async function removeHistoryItem(item: SearchHistoryItem) {
    await deleteSearchHistoryItem(user, item.query)
    setHistory((current) => current.filter((entry) => entry.id !== item.id))
  }

  async function clearHistory() {
    await clearSearchHistory(user)
    setHistory([])
  }

  const hasSuggestions = tracks.length > 0 || albums.length > 0 || artists.length > 0
  const showHistory = visible && cleanQuery.length < 2 && history.length > 0
  if (!visible || (!showHistory && cleanQuery.length < 2) || (!loading && cleanQuery.length >= 2 && !hasSuggestions)) return null

  return (
    <div
      ref={panelRef}
      className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50 border border-white/5"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {showHistory && (
        <>
          <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Buscas recentes</span>
            <button onClick={clearHistory} className="text-xs font-medium" style={{ color: 'var(--accent-solid)' }}>Limpar histórico</button>
          </div>
          {history.map((entry, index) => (
            <button
              key={entry.id}
              onClick={() => onSearch(entry.query)}
              onMouseEnter={() => setSelectedIndex(index)}
              className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
              style={{ backgroundColor: selectedIndex === index ? 'var(--bg-elevated)' : 'transparent' }}
            >
              <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-disabled)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1 text-sm truncate">{entry.query}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); void removeHistoryItem(entry) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); void removeHistoryItem(entry) } }}
                className="p-1 rounded-full hover:bg-white/10"
                aria-label={`Remover ${entry.query} do histórico`}
              >
                <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-disabled)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            </button>
          ))}
        </>
      )}

      {loading && cleanQuery.length >= 2 && (
        <div className="p-3 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-1 py-1.5">
              <div className="w-10 h-10 rounded-md" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded w-2/3" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
                <div className="h-2.5 rounded w-1/3" style={{ background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && cleanQuery.length >= 2 && (
        <>
          <SuggestionSection title="Faixas" items={tracks} selectedOffset={0} onHover={setSelectedIndex} render={(track, index) => (
            <SuggestionButton key={track.id} selected={selectedIndex === index} onClick={() => selectItem({ type: 'track', track })}>
              <SuggestionImage src={track.image} kind="track" />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{track.name}</p><p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{track.artist_name}</p></div>
            </SuggestionButton>
          )} />
          <SuggestionSection title="Artistas" items={artists} selectedOffset={tracks.length} onHover={setSelectedIndex} render={(artist, index) => (
            <SuggestionButton key={artist.id} selected={selectedIndex === index} onClick={() => selectItem({ type: 'artist', artist })}>
              <SuggestionImage src={artist.image} kind="artist" />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{artist.name}</p></div>
            </SuggestionButton>
          )} />
          <SuggestionSection title="Álbuns" items={albums} selectedOffset={tracks.length + artists.length} onHover={setSelectedIndex} render={(album, index) => (
            <SuggestionButton key={album.id} selected={selectedIndex === index} onClick={() => selectItem({ type: 'album', album })}>
              <SuggestionImage src={album.image} kind="album" />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{album.name}</p><p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{album.artist_name}</p></div>
            </SuggestionButton>
          )} />
          <div className="px-4 py-2 text-xs border-t flex items-center justify-between" style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-disabled)' }}>
            <span>Resultados para &ldquo;{cleanQuery}&rdquo;</span>
            <button onClick={() => onSearch(cleanQuery)} className="font-medium" style={{ color: 'var(--accent-solid)' }}>Ver todos</button>
          </div>
        </>
      )}
    </div>
  )
}

function SuggestionSection<T>({ title, items, selectedOffset, onHover, render }: {
  title: string
  items: T[]
  selectedOffset: number
  onHover: (index: number) => void
  render: (item: T, index: number) => ReactNode
}) {
  if (items.length === 0) return null
  return <><div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>{title}</div>{items.map((item, index) => <div key={selectedOffset + index} onMouseEnter={() => onHover(selectedOffset + index)}>{render(item, selectedOffset + index)}</div>)}</>
}

function SuggestionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors" style={{ backgroundColor: selected ? 'var(--bg-elevated)' : 'transparent' }}>{children}</button>
}

function SuggestionImage({ src, kind }: { src: string; kind: 'track' | 'album' | 'artist' }) {
  return <div className={`w-10 h-10 flex-shrink-0 overflow-hidden ${kind === 'artist' ? 'rounded-full' : 'rounded-md'}`} style={{ backgroundColor: 'var(--bg-elevated)' }}>{src ? <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full" />}</div>
}
