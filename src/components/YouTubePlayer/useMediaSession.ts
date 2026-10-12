'use client'

import { useEffect } from 'react'
import { usePlayerStore } from '@/lib/store'

interface MediaSessionDeps {
  seek: (seconds: number) => void
  getCurrentTime: () => number
  getDuration: () => number
}

const ACTIONS: MediaSessionAction[] = [
  'play',
  'pause',
  'previoustrack',
  'nexttrack',
  'seekto',
  'seekbackward',
  'seekforward',
]

function hasMediaSession(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

/**
 * Alimenta o painel de controle de mídia do SO/navegador (capa, título,
 * play/pause/next/prev, barra de posição) — igual Spotify/YouTube Music.
 * Re-setado imediatamente após reload, então o painel já mostra a última
 * faixa mesmo antes do playback retomar.
 */
export function useMediaSession({ seek, getCurrentTime, getDuration }: MediaSessionDeps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  useEffect(() => {
    if (!hasMediaSession()) return
    if (!currentTrack) {
      navigator.mediaSession.metadata = null
      return
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name,
        artist: currentTrack.artist_name,
        album: currentTrack.album_name || '',
        artwork: currentTrack.image
          ? [{ src: currentTrack.image, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      })
    } catch { /* MediaMetadata indisponível */ }
  }, [currentTrack])

  useEffect(() => {
    if (!hasMediaSession()) return
    const ms = navigator.mediaSession
    const safe = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try { ms.setActionHandler(action, handler) } catch { /* ação não suportada */ }
    }

    safe('play', () => usePlayerStore.getState().resume())
    safe('pause', () => usePlayerStore.getState().pause())
    safe('previoustrack', () => usePlayerStore.getState().prev())
    safe('nexttrack', () => usePlayerStore.getState().next())
    safe('seekto', (details) => {
      if (typeof details.seekTime === 'number') seek(details.seekTime)
    })
    safe('seekbackward', (details) => {
      seek(Math.max(0, getCurrentTime() - (details.seekOffset || 10)))
    })
    safe('seekforward', (details) => {
      const duration = getDuration()
      const target = getCurrentTime() + (details.seekOffset || 10)
      seek(duration > 0 ? Math.min(duration, target) : target)
    })

    return () => ACTIONS.forEach((a) => safe(a, null))
  }, [seek, getCurrentTime, getDuration])

  useEffect(() => {
    if (!hasMediaSession()) return
    try { navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused' } catch { /* noop */ }
  }, [isPlaying])

  useEffect(() => {
    if (!hasMediaSession()) return
    const update = () => {
      try {
        const s = usePlayerStore.getState()
        const duration = getDuration() || s.duration
        if (!Number.isFinite(duration) || duration <= 0) return
        const position = Math.min(getCurrentTime() || s.progress, duration)
        navigator.mediaSession.setPositionState({
          duration,
          position: Math.max(0, position),
          playbackRate: 1,
        })
      } catch { /* setPositionState inválido */ }
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [getCurrentTime, getDuration])
}
