'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerStore } from '@/lib/store'
import type { JamendoTrack } from '@/types/jamendo'

interface SuggestionItem {
  type: 'track' | 'artist'
  id: string
  name: string
  artist_name?: string
  image?: string
  audio?: string
  duration?: number
}

interface SearchSuggestionsProps {
  query: string
  onSelect: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

export function SearchSuggestions({ query, onSelect, inputRef }: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const router = useRouter()
  const play = usePlayerStore((s) => s.play)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    setLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/jamendo/suggest?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setSuggestions(data.results ?? [])
        setSelectedIndex(-1)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(debounceRef.current)
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

  function selectItem(item: SuggestionItem) {
    onSelect()
    setSuggestions([])
    if (item.type === 'artist') {
      router.push(`/artists/${item.id}`)
    } else {
      play({
        id: item.id,
        name: item.name,
        artist_name: item.artist_name ?? '',
        duration: item.duration ?? 0,
        image: item.image ?? '',
        audio: item.audio ?? '',
      } as JamendoTrack, [{
        id: item.id,
        name: item.name,
        artist_name: item.artist_name ?? '',
        duration: item.duration ?? 0,
        image: item.image ?? '',
        audio: item.audio ?? '',
      }] as JamendoTrack[])
    }
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
          key={`${item.type}-${item.id}`}
          onClick={() => selectItem(item)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
          style={{
            backgroundColor: idx === selectedIndex ? 'var(--bg-elevated)' : 'transparent',
          }}
          onMouseEnter={() => setSelectedIndex(idx)}
        >
          <div className="relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            {item.image ? (
              <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-disabled)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {item.type === 'artist' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                  )}
                </svg>
              </div>
            )}
            <span
              className="absolute bottom-0.5 right-0.5 text-[9px] font-bold px-1 rounded"
              style={{
                backgroundColor: item.type === 'artist' ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                color: item.type === 'artist' ? 'var(--accent-solid)' : 'var(--text-secondary)',
              }}
            >
              {item.type === 'artist' ? 'A' : 'M'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.name}</p>
            {item.artist_name && (
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {item.artist_name}
              </p>
            )}
          </div>
        </button>
      ))}
      <div
        className="px-4 py-2 text-xs border-t flex items-center justify-between"
        style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-disabled)' }}
      >
        <span>Resultados para &ldquo;{query}&rdquo;</span>
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
