'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePlayerStore } from '@/lib/store'
import type { RepeatMode } from '@/lib/store'
import { formatDuration } from '@/lib/spotify'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { savePlaybackHistory } from '@/lib/playback-history'
import { ChevronUp } from 'lucide-react'

export function Player() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sleepRemaining, setSleepRemaining] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  const {
    currentTrack, isPlaying, volume, progress, duration, queue,
    currentPlaylistId, currentPlaylistName, repeat, shuffle,
    crossfadeDuration, sleepTimerMinutes, miniPlayer,
    pause, resume, next, prev, togglePlay,
    setVolume, setProgress, setDuration,
    setRepeat, toggleShuffle, setSleepTimer, toggleMiniPlayer,
  } = usePlayerStore()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    if (isPlaying && currentTrack && user) {
      void savePlaybackHistory(user, currentTrack)
    }
  }, [currentTrack, isPlaying, user])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (isPlaying) audio.play().catch(() => {})
    else audio.pause()
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
    if (currentTrack.audio) {
      audio.src = currentTrack.audio
      audio.load()
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [currentTrack])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current)
    setSleepRemaining(null)

    if (sleepTimerMinutes && sleepTimerMinutes > 0) {
      const endTime = Date.now() + sleepTimerMinutes * 60 * 1000

      timerRef.current = setTimeout(() => {
        pause()
        setSleepTimer(null)
        setSleepRemaining(null)
        showToast(`Sleep timer: música pausada`)
      }, sleepTimerMinutes * 60 * 1000)

      sleepIntervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
        if (remaining <= 0) {
          setSleepRemaining(null)
          return
        }
        const m = Math.floor(remaining / 60)
        const s = remaining % 60
        setSleepRemaining(`${m}:${s.toString().padStart(2, '0')}`)
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current)
    }
  }, [sleepTimerMinutes])

  const handleCrossfade = useCallback(() => {
    const audio = audioRef.current
    if (!audio || crossfadeDuration <= 0) return next()

    const fadeInterval = 30
    const steps = Math.floor((crossfadeDuration * 1000) / fadeInterval)
    const stepVolume = volume / steps
    let currentStep = 0

    const fadeOut = setInterval(() => {
      currentStep++
      if (audioRef.current) {
        audioRef.current.volume = Math.max(0, (audioRef.current.volume || volume) - stepVolume)
      }
      if (currentStep >= steps) {
        clearInterval(fadeOut)
        next()
        setTimeout(() => {
          if (audioRef.current) audioRef.current.volume = volume
        }, 50)
      }
    }, fadeInterval)
  }, [crossfadeDuration, volume, next])

  if (!currentTrack) return null

  function handleProgressClick(e: React.MouseEvent) {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect || !audioRef.current) return
    const x = (e.clientX - rect.left) / rect.width
    const newTime = x * duration
    audioRef.current.currentTime = newTime
    setProgress(newTime)
  }

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0

  const repeatLabel: Record<RepeatMode, string> = { none: 'Sem repeat', one: 'Repeat 1', all: 'Repeat tudo' }

  if (miniPlayer) {
    return (
      <>
        <audio ref={audioRef} />
        <footer className="h-14 md:hidden flex-shrink-0 flex items-center px-3 gap-3 border-t border-white/5"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <Link href="/reproducao" className="flex-shrink-0">
            <img src={currentTrack.image} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{currentTrack.name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{currentTrack.artist_name}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); togglePlay() }}
            className="rounded-full p-2 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
          >
            {isPlaying ? (
              <svg className="w-4 h-4" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button onClick={(e) => { e.stopPropagation(); toggleMiniPlayer() }} className="p-1" style={{ color: 'var(--text-disabled)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <Link href="/reproducao" onClick={(e) => e.stopPropagation()} className="p-1" style={{ color: 'var(--text-disabled)' }} title="Abrir player">
            <ChevronUp className="w-5 h-5" />
          </Link>
        </footer>
      </>
    )
  }

  return (
    <>
      <audio ref={audioRef} />

      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm shadow-lg animate-fade-in"
          style={{ backgroundColor: 'var(--success)', color: '#fff' }}>
          {toast}
        </div>
      )}

      {sleepRemaining && (
        <div className="fixed bottom-28 right-4 z-50 px-3 py-1.5 rounded-lg text-xs shadow-lg flex items-center gap-2"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {sleepRemaining}
          <button onClick={() => setSleepTimer(null)} className="ml-1 hover:text-primary">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <footer
        className="h-20 flex-shrink-0 flex items-center px-4 border-t border-white/5"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center gap-3 w-72">
          <Link href="/reproducao" className="flex-shrink-0">
            <img src={currentTrack.image} alt={currentTrack.name} className="w-12 h-12 rounded object-cover flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer" />
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{currentTrack.name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{currentTrack.artist_name}</p>
            {currentPlaylistId && (
              <a href={`/playlists/${currentPlaylistId}`}
                className="text-[10px] truncate hover:underline"
                style={{ color: 'var(--accent-from)' }}
                onClick={(e) => e.stopPropagation()}>
                {currentPlaylistName}
              </a>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <button onClick={toggleShuffle}
              className="p-1.5 transition-colors"
              style={{ color: shuffle ? 'var(--accent-from)' : 'var(--text-secondary)' }}
              title={shuffle ? 'Desativar shuffle' : 'Ativar shuffle'}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button onClick={prev} className="text-secondary hover:text-primary transition-colors p-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button onClick={togglePlay}
              className="rounded-full p-2 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}>
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

            <button onClick={() => {
              const modes: RepeatMode[] = ['none', 'all', 'one']
              const idx = modes.indexOf(repeat)
              setRepeat(modes[(idx + 1) % modes.length])
            }}
              className="p-1.5 transition-colors relative"
              style={{ color: repeat !== 'none' ? 'var(--accent-from)' : 'var(--text-secondary)' }}
              title={repeatLabel[repeat]}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {repeat === 'one' && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold" style={{ color: 'var(--accent-from)' }}>1</span>
              )}
            </button>
          </div>

          <div className="w-full max-w-lg flex items-center gap-2 text-xs" style={{ color: 'var(--text-disabled)' }}>
            <span className="w-8 text-right">{formatDuration(Math.floor(progress))}</span>
            <div ref={progressRef}
              className="flex-1 h-1 rounded-full cursor-pointer relative"
              style={{ backgroundColor: 'var(--text-disabled)' }}
              onClick={handleProgressClick}>
              <div className="h-full rounded-full relative group"
                style={{ width: `${progressPercent}%`, background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'var(--accent-from)' }} />
              </div>
            </div>
            <span className="w-8 text-left">{formatDuration(Math.floor(duration))}</span>
          </div>
        </div>

        <div className="w-72 flex items-center justify-end gap-2">
          <SleepTimerDropdown />

          <div className="items-center gap-1.5 hidden md:flex">
            <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 h-1 accent-[var(--accent-from)]" />
          </div>

          <button onClick={toggleMiniPlayer} className="md:hidden p-1.5 text-secondary hover:text-primary" title="Mini player">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <Link href="/reproducao" className="hidden md:flex p-1.5 transition-colors" style={{ color: 'var(--text-secondary)' }} title="Abrir player">
            <ChevronUp className="w-5 h-5" />
          </Link>
        </div>
      </footer>
    </>
  )
}

function SleepTimerDropdown() {
  const { sleepTimerMinutes, setSleepTimer } = usePlayerStore()
  const [open, setOpen] = useState(false)

  const options = [
    { label: '5 min', value: 5 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '60 min', value: 60 },
  ]

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="p-1.5 transition-colors"
        style={{ color: sleepTimerMinutes ? 'var(--accent-from)' : 'var(--text-secondary)' }}
        title="Sleep timer">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2 z-50 rounded-xl p-2 shadow-xl min-w-[140px]"
            style={{ backgroundColor: 'var(--bg-elevated)' }}>
            {sleepTimerMinutes && (
              <button onClick={() => { setSleepTimer(null); setOpen(false) }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                style={{ color: 'var(--accent-from)' }}>
                Desativar timer
              </button>
            )}
            {options.map((opt) => (
              <button key={opt.value}
                onClick={() => { setSleepTimer(opt.value); setOpen(false) }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                style={{ color: sleepTimerMinutes === opt.value ? 'var(--accent-from)' : 'var(--text-primary)' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
