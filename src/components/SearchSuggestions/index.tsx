'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useYouTubePlayer } from '@/hooks/use-youtube-player'
import { usePlayerStore } from '@/lib/store'
import type { JamendoTrack } from '@/types/jamendo'

interface YouTubeSuggestion {
  videoId: string
  title: string
  channelTitle: string
  thumbnails: Record<string, { url: string; width: number; height: number }>
}

interface SearchSuggestionsProps {
  query: string
  onSelect: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

export function SearchSuggestions({ query, onSelect, inputRef }: SearchSuggestionsProps) {
  const [ytSuggestions, setYtSuggestions] = useState<YouTubeSuggestion[]>([])
  const [jamendoSuggestions, setJamendoSuggestions] = useState<JamendoTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const router = useRouter()
  const { play: playYouTube } = useYouTubePlayer()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const panelRef = useRef<HTMLDivElement>(null)
  const ytSeenIds = useRef(new Set<string>())

  useEffect(() => {
    if (query.length < 2) {
      setYtSuggestions([])
      setJamendoSuggestions([])
      ytSeenIds.current.clear()
      return
    }

    setLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const [ytRes, jamRes] = await Promise.all([
          fetch(`/api/youtube?q=${encodeURIComponent(query)}&maxResults=3`),
          fetch(`/api/jamendo?endpoint=tracks&search=${encodeURIComponent(query)}&limit=3&order=popularity_week`),
        ])

        if (ytRes.ok) {
          const ytData = await ytRes.json()
          const ytResults = (ytData.results ?? []) as YouTubeSuggestion[]
          const deduped = ytResults.filter((item) => !ytSeenIds.current.has(item.videoId))
          const ids = new Set(ytResults.map((r: YouTubeSuggestion) => r.videoId))
          ids.forEach((id: string) => ytSeenIds.current.add(id))
          setYtSuggestions(deduped)
        }

        if (jamRes.ok) {
          const jamData = await jamRes.json()
          setJamendoSuggestions((jamData.results ?? []).slice(0, 3))
        }

        setSelectedIndex(-1)
      } catch {
        setYtSuggestions([])
        setJamendoSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setYtSuggestions([])
        setJamendoSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [inputRef])

  const allItems = useCallback(() => {
    const items: ({ type: 'jamendo'; track: JamendoTrack } | { type: 'youtube'; item: YouTubeSuggestion })[] = []
    jamendoSuggestions.forEach((t) => items.push({ type: 'jamendo', track: t }))
    ytSuggestions.forEach((i) => items.push({ type: 'youtube', item: i }))
    return items
  }, [jamendoSuggestions, ytSuggestions])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const items = allItems()
    if (items.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          const item = items[selectedIndex]
          if (item.type === 'youtube') {
            onSelect()
            setYtSuggestions([])
            setJamendoSuggestions([])
            playYouTube(item.item.videoId)
          } else {
            onSelect()
            setYtSuggestions([])
            setJamendoSuggestions([])
            const { play } = usePlayerStore.getState()
            if (typeof play === 'function') {
              play(item.track, jamendoSuggestions)
            }
          }
        } else {
          onSelect()
          setYtSuggestions([])
          setJamendoSuggestions([])
          router.push(`/?q=${encodeURIComponent(query)}`)
        }
        break
      case 'Escape':
        setYtSuggestions([])
        setJamendoSuggestions([])
        break
    }
  }, [allItems, selectedIndex, onSelect, query, playYouTube, jamendoSuggestions])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    setSelectedIndex(-1)
  }, [ytSuggestions, jamendoSuggestions])

  function playJamendo(track: JamendoTrack) {
    onSelect()
    setYtSuggestions([])
    setJamendoSuggestions([])
    const { play } = usePlayerStore.getState()
    if (typeof play === 'function') {
      const tracks = jamendoSuggestions
      play(track, tracks)
    }
  }

  const hasAny = ytSuggestions.length > 0 || jamendoSuggestions.length > 0
  if (query.length < 2 || !hasAny) return null

  return (
    <div
      ref={panelRef}
      className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {loading && !hasAny && (
        <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Buscando...
        </div>
      )}

      {jamendoSuggestions.length > 0 && (
        <>
          <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
            Músicas
          </div>
          {jamendoSuggestions.map((track) => (
            <button
              key={`jam-${track.id}`}
              onClick={() => playJamendo(track)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={() => {
                const items = allItems()
                const idx = items.findIndex((i) => i.type === 'jamendo' && i.track.id === track.id)
                if (idx >= 0) setSelectedIndex(idx)
              }}
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
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {track.artist_name}
                </p>
              </div>
            </button>
          ))}
        </>
      )}

      {ytSuggestions.length > 0 && (
        <>
          <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
            Vídeos
          </div>
          {ytSuggestions.map((item, idx) => {
            const items = allItems()
            const actualIdx = items.findIndex((i) => i.type === 'youtube' && i.item.videoId === item.videoId)
            return (
              <button
                key={item.videoId}
                onClick={() => {
                  onSelect()
                  setYtSuggestions([])
                  setJamendoSuggestions([])
                  playYouTube(item.videoId)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  backgroundColor: actualIdx === selectedIndex ? 'var(--bg-elevated)' : 'transparent',
                }}
                onMouseEnter={() => setSelectedIndex(actualIdx)}
              >
                <div className="relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  {item.thumbnails?.default?.url ? (
                    <img src={item.thumbnails.default.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-disabled)' }}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                      </svg>
                    </div>
                  )}
                  <span
                    className="absolute bottom-0.5 right-0.5 text-[9px] font-bold px-1 rounded"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-solid)' }}
                  >
                    YT
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {item.channelTitle}
                  </p>
                </div>
              </button>
            )
          })}
        </>
      )}

      <div
        className="px-4 py-2 text-xs border-t flex items-center justify-between"
        style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-disabled)' }}
      >
        <span>Resultados para &ldquo;{query}&rdquo;</span>
        <button
          onClick={() => {
            onSelect()
            router.push(`/?q=${encodeURIComponent(query)}`)
          }}
          className="font-medium"
          style={{ color: 'var(--accent-solid)' }}
        >
          Ver todos
        </button>
      </div>
    </div>
  )
}
