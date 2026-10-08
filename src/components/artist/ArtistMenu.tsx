'use client'

import { useState, useRef, useEffect } from 'react'

interface ArtistMenuProps {
  artistName: string
  artistUrl?: string
}

export function ArtistMenu({ artistName, artistUrl }: ArtistMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: artistName, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors hover:bg-state-pressed state-layer"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Mais ações"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 min-w-[220px] rounded-xl shadow-elevation-2 py-1 z-50 border border-outline-variant"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <button
            onClick={handleShare}
            className="flex items-center gap-3 w-full px-4 min-h-[48px] text-body-medium text-left transition-colors hover:bg-state-hover state-layer"
            style={{ color: 'var(--text-primary)' }}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Compartilhar
          </button>

          {artistUrl && (
            <a
              href={artistUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 w-full px-4 min-h-[48px] text-body-medium text-left transition-colors hover:bg-state-hover state-layer"
              style={{ color: 'var(--text-primary)' }}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Abrir no Deezer
            </a>
          )}
        </div>
      )}
    </div>
  )
}
