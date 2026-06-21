'use client'

import { useRef, useEffect, useState } from 'react'
import { usePlayerStore } from '@/lib/store'
import { formatDuration, getDownloadUrl } from '@/lib/jamendo'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function Player() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const supabase = createClient()

  const {
    currentTrack,
    isPlaying,
    volume,
    progress,
    duration,
    queue,
    pause,
    resume,
    next,
    prev,
    togglePlay,
    setVolume,
    setProgress,
    setDuration,
  } = usePlayerStore()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    if (isPlaying) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [isPlaying, currentTrack])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const onTimeUpdate = () => {
      if (!isDragging) setProgress(audio.currentTime)
    }
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => next()

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)

    audio.volume = volume
    audio.src = currentTrack.audio
    audio.load()

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [currentTrack])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  if (!currentTrack) return null

  function handleProgressClick(e: React.MouseEvent) {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect || !audioRef.current) return
    const x = (e.clientX - rect.left) / rect.width
    const newTime = x * duration
    audioRef.current.currentTime = newTime
    setProgress(newTime)
  }

  function handleDownload() {
    if (!currentTrack) return
    const url = getDownloadUrl(currentTrack)
    if (!url) {
      setToast('Download não disponível para esta faixa')
      setTimeout(() => setToast(null), 2000)
      return
    }
    setToast('Download iniciado!')
    setTimeout(() => setToast(null), 2000)
  }

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <>
      <audio ref={audioRef} />

      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm shadow-lg"
          style={{ backgroundColor: 'var(--success)', color: '#fff' }}
        >
          {toast}
        </div>
      )}

      <footer
        className="h-20 flex-shrink-0 flex items-center px-4 border-t border-white/5"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center gap-3 w-72">
          <img
            src={currentTrack.image}
            alt={currentTrack.name}
            className="w-12 h-12 rounded object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{currentTrack.name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {currentTrack.artist_name}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button onClick={prev} className="text-secondary hover:text-primary transition-colors p-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={togglePlay}
              className="rounded-full p-2 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button onClick={next} className="text-secondary hover:text-primary transition-colors p-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          <div className="w-full max-w-lg flex items-center gap-2 text-xs" style={{ color: 'var(--text-disabled)' }}>
            <span className="w-8 text-right">{formatDuration(Math.floor(progress))}</span>
            <div
              ref={progressRef}
              className="flex-1 h-1 rounded-full cursor-pointer relative"
              style={{ backgroundColor: 'var(--text-disabled)' }}
              onClick={handleProgressClick}
            >
              <div
                className="h-full rounded-full relative group"
                style={{ width: `${progressPercent}%`, background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
              >
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'var(--accent-from)' }}
                />
              </div>
            </div>
            <span className="w-8 text-left">{formatDuration(Math.floor(duration))}</span>
          </div>
        </div>

        <div className="w-72 flex items-center justify-end gap-3">
          <button onClick={handleDownload} className="text-secondary hover:text-primary transition-colors" title="Download">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 accent-[var(--accent-from)]"
            />
          </div>
        </div>
      </footer>
    </>
  )
}
