'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerStore } from '@/lib/store'
import type { Track } from '@/types/music'

interface SearchSuggestionsProps {
  query: string
  onSelect: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

export function SearchSuggestions({ query, onSelect, inputRef }: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const router = useRouter()
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
        const res = await fetch(`/api/spotify?endpoint=search&q=${encodeURIComponent(query)}&type=track&limit=3`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.tracks ?? [])
        }
        setSelectedIndex(-1)
      } catch {
        setSuggestions([])
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
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [inputRef])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (suggestions.length === 0) return
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (suggestions.length === 0) return
        setSelectedIndex((prev) => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          setSuggestions([])
          onSelect()
          const { play } = usePlayerStore.getState()
          if (typeof play === 'function') {
            play(suggestions[selectedIndex], suggestions)
          }
        } else {
          onSelect()
          router.push(`/?q=${encodeURIComponent(query)}`)
        }
        break
      case 'Escape':
        setSuggestions([])
        break
    }
  }, [suggestions, selectedIndex, onSelect, query, router])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    setSelectedIndex(-1)
  }, [suggestions])

  function playTrack(track: Track) {
    onSelect()
    setSuggestions([])
    const { play } = usePlayerStore.getState()
    if (typeof play === 'function') {
      play(track, suggestions)
    }
  }

  if (query.length < 2 || suggestions.length === 0) return null

  return (
    <div
      ref={panelRef}
      className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
        Músicas
      </div>
      {suggestions.map((track) => (
        <button
          key={track.id}
          onClick={() => playTrack(track)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
          style={{
            backgroundColor: suggestions.indexOf(track) === selectedIndex ? 'var(--bg-elevated)' : 'transparent',
          }}
          onMouseEnter={() => setSelectedIndex(suggestions.indexOf(track))}
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
