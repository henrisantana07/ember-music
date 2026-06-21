'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useYouTubePlayer } from '@/hooks/use-youtube-player'

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
  const [suggestions, setSuggestions] = useState<YouTubeSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const router = useRouter()
  const { play: playYouTube } = useYouTubePlayer()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const panelRef = useRef<HTMLDivElement>(null)
  const seenIds = useRef(new Set<string>())

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      seenIds.current.clear()
      return
    }

    setLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/youtube?q=${encodeURIComponent(query)}&maxResults=5`)
        if (!res.ok) { setSuggestions([]); return }
        const data = await res.json()
        const results = (data.results ?? []) as YouTubeSuggestion[]
        const deduped = results.filter(
          (item) => !seenIds.current.has(item.videoId)
        )
        const ids = new Set(results.map((r: YouTubeSuggestion) => r.videoId))
        ids.forEach((id: string) => seenIds.current.add(id))
        setSuggestions(deduped)
        setSelectedIndex(-1)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [inputRef])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectItem(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setSuggestions([])
        break
    }
  }, [suggestions, selectedIndex])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    setSelectedIndex(-1)
  }, [suggestions])

  function selectItem(item: YouTubeSuggestion) {
    onSelect()
    setSuggestions([])
    playYouTube(item.videoId)
  }

  if (query.length < 2 || suggestions.length === 0) return null

  return (
    <div
      ref={panelRef}
      className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {loading && suggestions.length === 0 && (
        <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Buscando...
        </div>
      )}

      {suggestions.map((item, idx) => (
        <button
          key={item.videoId}
          onClick={() => selectItem(item)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
          style={{
            backgroundColor: idx === selectedIndex ? 'var(--bg-elevated)' : 'transparent',
          }}
          onMouseEnter={() => setSelectedIndex(idx)}
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
      ))}
      <div
        className="px-4 py-2 text-xs border-t flex items-center justify-between"
        style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-disabled)' }}
      >
        <span>YouTube &mdash; &ldquo;{query}&rdquo;</span>
        <button
          onClick={() => {
            onSelect()
            router.push(`/search?q=${encodeURIComponent(query)}`)
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
