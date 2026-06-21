'use client'

import { useEffect, useState } from 'react'
import { useYouTubePlayer } from '@/hooks/use-youtube-player'

interface YouTubePlayerModalProps {
  videoId: string
  title: string
  channelTitle: string
  open: boolean
  onClose: () => void
}

export function YouTubePlayer({ videoId, title, channelTitle, open, onClose }: YouTubePlayerModalProps) {
  const { apiReady, containerId, play, stop } = useYouTubePlayer()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (open && apiReady && videoId) {
      play(videoId)
      setLoaded(true)
    }
    if (!open) {
      stop()
      setLoaded(false)
    }
  }, [open, apiReady, videoId, play, stop])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="font-semibold text-sm truncate">{title}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {channelTitle} &middot; YouTube
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div id={containerId} className="w-full" style={{ aspectRatio: '16/9' }} />

        <div className="p-4">
          <a
            href={`https://youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent-solid)' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            Abrir no YouTube
          </a>
        </div>
      </div>
    </div>
  )
}
