'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { usePlayerStore } from '@/lib/store'
import type { RepeatMode } from '@/lib/store'
import type { Track } from '@/types/music'
import { formatDuration } from '@/lib/spotify'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { savePlaybackHistory } from '@/lib/playback-history'
import { ExpandedPlayerModal } from '@/components/ExpandedPlayerModal'
import { useYouTube, useYouTubeTime } from '@/components/YouTubePlayer/context'
import { ChevronUp, Shuffle, SkipBack, SkipForward, Repeat, Repeat1, Play, Pause } from 'lucide-react'

export function Player() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sleepRemaining, setSleepRemaining] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const retryingId = useRef<string | null>(null)
  const supabase = createClient()

  const {
    currentTrack, isPlaying, volume, progress, duration, queue,
    currentPlaylistId, currentPlaylistName, repeat, shuffle,
    crossfadeDuration, sleepTimerMinutes, miniPlayer,
    pause, resume, next, prev, togglePlay,
    setVolume, setProgress, setDuration,
    setRepeat, toggleShuffle, setSleepTimer, toggleMiniPlayer,
    openExpanded,
  } = usePlayerStore()

  const isYouTubeTrack = currentTrack?.source === 'youtube' && !!currentTrack.youtubeVideoId

  const yt = useYouTube()
  const { seek: ytSeek, getCurrentTime: ytGetCurrentTime } = yt
  const { currentTime: ytCurrentTime, duration: ytDuration } = useYouTubeTime()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    if (isPlaying && currentTrack && user) {
      void savePlaybackHistory(user, currentTrack)
    }
  }, [currentTrack?.id, isPlaying, user])

  useEffect(() => {
    if (!isYouTubeTrack) return
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }, [isYouTubeTrack])

  useEffect(() => {
    if (!isYouTubeTrack) {
      const audio = audioRef.current
      if (!audio || !currentTrack) return

      retryingId.current = null

      function attachEvents() {
        audio!.addEventListener('canplay', onCanPlay)
        audio!.addEventListener('ended', onEnded)
        audio!.addEventListener('error', onError)
        audio!.addEventListener('timeupdate', onTimeUpdate)
        audio!.addEventListener('loadedmetadata', onLoadedMetadata)
      }

      const onCanPlay = () => {
        if (usePlayerStore.getState().isPlaying) {
          audio.play().catch(() => {})
        }
      }

      const onEnded = () => {
        const { repeat: currentRepeat } = usePlayerStore.getState()
        if (currentRepeat === 'one') {
          audio.currentTime = 0
          audio.play().catch(() => {})
          return
        }
        next()
      }

      const onError = async () => {
        const trackId = usePlayerStore.getState().currentTrack?.id
        if (!trackId || retryingId.current === trackId) {
          retryingId.current = null
          next()
          return
        }
        retryingId.current = trackId
        try {
          const res = await fetch(`/api/deezer?endpoint=tracks&id=${trackId}`)
          if (!res.ok) throw new Error('fetch failed')
          const data = await res.json()
          const fresh = data.results?.[0] as Track | undefined
          if (fresh?.audio && usePlayerStore.getState().currentTrack?.id === trackId) {
            audio.src = fresh.audio
            audio.load()
            return
          }
        } catch (e) {
          console.error('Erro ao atualizar URL do áudio:', e)
        }
        retryingId.current = null
        next()
      }

      const onTimeUpdate = () => {
        if (!isDragging) setProgress(audio.currentTime)
      }

      const onLoadedMetadata = () => setDuration(audio.duration)

      if (!currentTrack.audio) {
        const trackId = usePlayerStore.getState().currentTrack?.id
        if (trackId) {
          ;(async () => {
            try {
              const res = await fetch(`/api/deezer?endpoint=tracks&id=${trackId}`)
              if (res.ok) {
                const data = await res.json()
                const fresh = data.results?.[0] as Track | undefined
                if (fresh?.audio && usePlayerStore.getState().currentTrack?.id === trackId) {
                  audio.src = fresh.audio
                  audio.load()
                  attachEvents()
                  return
                }
              }
            } catch (e) {
              console.error('Erro ao buscar áudio:', e)
            }
            next()
          })()
          return
        }
        next()
        return
      }

      audio.volume = volume
      audio.src = currentTrack.audio
      audio.load()

      attachEvents()

      return () => {
        audio.removeEventListener('canplay', onCanPlay)
        audio.removeEventListener('ended', onEnded)
        audio.removeEventListener('error', onError)
        audio.removeEventListener('timeupdate', onTimeUpdate)
        audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      }
    }
  }, [currentTrack?.id, isYouTubeTrack])

  useEffect(() => {
    if (!isYouTubeTrack) {
      const audio = audioRef.current
      if (!audio || !currentTrack || !currentTrack.audio) return
      if (isPlaying) {
        if (audio.readyState >= 2) {
          audio.play().catch(() => {})
        }
      } else {
        audio.pause()
      }
    }
  }, [isPlaying, isYouTubeTrack])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const handleSeek = useCallback((seconds: number) => {
    if (isYouTubeTrack) {
      ytSeek(seconds)
    } else {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = seconds
        setProgress(seconds)
      }
    }
  }, [isYouTubeTrack, ytSeek])

  const handlePrev = useCallback(() => {
    const currentTime = isYouTubeTrack ? ytGetCurrentTime() : (audioRef.current?.currentTime ?? 0)
    if (currentTime > 3) {
      handleSeek(0)
    } else {
      prev()
    }
  }, [isYouTubeTrack, ytGetCurrentTime, handleSeek, prev])

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
  }, [sleepTimerMinutes, pause, setSleepTimer, showToast])

  const handleCrossfade = useCallback(() => {
    if (isYouTubeTrack) {
      pause()
      next()
    } else {
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
    }
  }, [crossfadeDuration, volume, next, isYouTubeTrack, pause])

  if (!currentTrack) return null

  const currentDuration = isYouTubeTrack ? ytDuration : duration
  const currentProgress = isYouTubeTrack ? ytCurrentTime : progress
  const progressPercent = currentDuration > 0 ? (currentProgress / currentDuration) * 100 : 0

  const repeatLabel: Record<RepeatMode, string> = { none: 'Sem repeat', one: 'Repeat 1', all: 'Repeat tudo' }

  function handleProgressClick(e: React.MouseEvent) {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width
    const newTime = x * currentDuration
    handleSeek(newTime)
  }

  if (miniPlayer) {
    return (
      <>
        <audio ref={audioRef} />
        <footer className="h-14 md:hidden flex-shrink-0 relative z-[70] flex items-center px-3 gap-3 border-t border-outline-variant"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <button onClick={openExpanded} className="flex-shrink-0" aria-label="Abrir player expandido">
            <img src={currentTrack.image} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-body-medium font-semibold truncate">{currentTrack.name}</p>
              {isYouTubeTrack && <YouTubeBadge />}
            </div>
            <p className="text-body-medium truncate" style={{ color: 'var(--text-secondary)' }}>{currentTrack.artist_name}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); togglePlay() }}
            className="h-11 w-11 rounded-full flex items-center justify-center state-layer"
            style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
            aria-label={isPlaying ? 'Pausar' : 'Tocar'}>
            {isPlaying ? (
              <Pause className="w-5 h-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" />
            ) : (
              <Play className="w-5 h-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" />
            )}
          </button>
          <button onClick={(e) => { e.stopPropagation(); toggleMiniPlayer() }} className="h-11 w-11 inline-flex items-center justify-center rounded-full state-layer" style={{ color: 'var(--text-disabled)' }} aria-label="Minimizar player">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button onClick={openExpanded} className="h-11 w-11 inline-flex items-center justify-center rounded-full state-layer" style={{ color: 'var(--text-disabled)' }} title="Abrir player" aria-label="Abrir player expandido">
            <ChevronUp className="w-5 h-5" />
          </button>
        </footer>
        <ExpandedPlayerModal />
      </>
    )
  }

  return (
    <>
      <audio ref={audioRef} />

      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm shadow-lg animate-fade-in"
          style={{ backgroundColor: 'var(--success)', color: 'var(--text-on-accent)' }}>
          {toast}
        </div>
      )}

      {sleepRemaining && (
        <div className="fixed bottom-28 right-4 z-50 px-4 py-2 rounded-xl text-body-medium shadow-elevation-3 flex items-center gap-2"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {sleepRemaining}
          <button onClick={() => setSleepTimer(null)} className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:text-primary state-layer" aria-label="Cancelar sleep timer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <footer
        className="h-20 flex-shrink-0 relative z-[70] flex items-center px-4 border-t border-outline-variant"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center gap-3 w-40 md:w-72">
          <button onClick={openExpanded} className="flex-shrink-0" aria-label="Abrir player expandido">
            <img src={currentTrack.image} alt={currentTrack.name} className="w-12 h-12 rounded object-cover flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-body-large font-semibold truncate">{currentTrack.name}</p>
              {isYouTubeTrack && <YouTubeBadge />}
            </div>
            <p className="text-body-medium truncate" style={{ color: 'var(--text-secondary)' }}>{currentTrack.artist_name}</p>
            {currentPlaylistId && (
              <a href={`/playlists/${currentPlaylistId}`}
                className="text-label-medium truncate hover:underline"
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
              className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors state-layer"
              style={{ color: shuffle ? 'var(--accent-from)' : 'var(--text-secondary)' }}
              title={shuffle ? 'Desativar shuffle' : 'Ativar shuffle'}
              aria-label={shuffle ? 'Desativar shuffle' : 'Ativar shuffle'}
              aria-pressed={shuffle}>
              <Shuffle className="w-5 h-5" />
            </button>

            <button onClick={handlePrev} className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors state-layer" style={{ color: 'var(--text-secondary)' }} title="Anterior" aria-label="Faixa anterior">
              <SkipBack className="w-6 h-6" fill="currentColor" />
            </button>

            <button onClick={togglePlay}
              className="h-12 w-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 state-layer"
              style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
              aria-label={isPlaying ? 'Pausar' : 'Tocar'}>
              {isPlaying ? (
                <Pause className="w-6 h-6" style={{ color: 'var(--bg-base)' }} fill="currentColor" />
              ) : (
                <Play className="w-6 h-6" style={{ color: 'var(--bg-base)' }} fill="currentColor" />
              )}
            </button>

            <button onClick={next} className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors state-layer" style={{ color: 'var(--text-secondary)' }} title="Próxima" aria-label="Próxima faixa">
              <SkipForward className="w-6 h-6" fill="currentColor" />
            </button>

            <button onClick={() => {
              const modes: RepeatMode[] = ['none', 'all', 'one']
              const idx = modes.indexOf(repeat)
              setRepeat(modes[(idx + 1) % modes.length])
            }}
              className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors relative state-layer"
              style={{ color: repeat !== 'none' ? 'var(--accent-from)' : 'var(--text-secondary)' }}
              title={repeatLabel[repeat]}
              aria-label={repeatLabel[repeat]}>
              {repeat === 'one' ? (
                <Repeat1 className="w-5 h-5" />
              ) : (
                <Repeat className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="w-full flex items-center gap-2 text-label-medium" style={{ color: 'var(--text-disabled)' }}>
            <span className="w-8 text-right">{formatDuration(Math.floor(currentProgress))}</span>
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
            <span className="w-8 text-left">{formatDuration(Math.floor(currentDuration))}</span>
          </div>
        </div>

        <div className="w-auto md:w-72 flex items-center justify-end gap-1">
          <SleepTimerDropdown />

          <div className="items-center gap-1.5 flex">
            <svg className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Volume"
              className="w-14 md:w-20 h-1 accent-[var(--accent-from)]" />
          </div>

          <button onClick={toggleMiniPlayer} className="md:hidden h-11 w-11 inline-flex items-center justify-center rounded-full transition-colors state-layer" style={{ color: 'var(--text-secondary)' }} title="Mini player" aria-label="Ativar mini player">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <button onClick={openExpanded} className="h-11 w-11 inline-flex items-center justify-center rounded-full transition-colors state-layer" style={{ color: 'var(--text-secondary)' }} title="Abrir player" aria-label="Abrir player expandido">
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      </footer>

      <ExpandedPlayerModal />
    </>
  )
}

function YouTubeBadge() {
  return (
    <span
      className="flex-shrink-0 text-label-medium font-semibold px-1.5 py-0.5 rounded"
      style={{ backgroundColor: 'color-mix(in srgb, var(--error) 15%, transparent)', color: 'var(--error)' }}
    >
      YT
    </span>
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
        className="h-11 w-11 inline-flex items-center justify-center rounded-full transition-colors state-layer"
        style={{ color: sleepTimerMinutes ? 'var(--accent-from)' : 'var(--text-secondary)' }}
        title="Sleep timer"
        aria-label="Sleep timer"
        aria-haspopup="menu"
        aria-expanded={open}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2 z-50 rounded-xl p-2 shadow-elevation-3 border border-outline-variant min-w-[160px]"
            style={{ backgroundColor: 'var(--bg-elevated)' }}>
            {sleepTimerMinutes && (
              <button onClick={() => { setSleepTimer(null); setOpen(false) }}
                className="w-full text-left px-4 min-h-[48px] rounded-lg text-body-medium transition-colors hover:bg-state-hover state-layer"
                style={{ color: 'var(--accent-from)' }}>
                Desativar timer
              </button>
            )}
            {options.map((opt) => (
              <button key={opt.value}
                onClick={() => { setSleepTimer(opt.value); setOpen(false) }}
                className="w-full text-left px-4 min-h-[48px] rounded-lg text-body-medium transition-colors hover:bg-state-hover state-layer"
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
