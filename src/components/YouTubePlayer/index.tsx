'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePlayerStore } from '@/lib/store'

interface YouTubePlayerState {
  player: YTPlayer | null
  isReady: boolean
  isPlaying: boolean
  duration: number
  currentTime: number
  volume: number
  error: string | null
}

interface UseYouTubePlayerReturn extends YouTubePlayerState {
  containerRef: React.RefObject<HTMLDivElement | null>
  play: () => void
  pause: () => void
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
  destroy: () => void
}

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  setVolume: (volume: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
}

interface YTPlayerEvent {
  target: YTPlayer
  data: number
}

interface YTPlayerOptions {
  videoId: string
  playerVars: Record<string, unknown>
  events: Record<string, ((event: YTPlayerEvent) => void) | undefined>
}

interface YT {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number; CUED: number; UNSTARTED: number }
}

declare global {
  interface Window {
    YT: YT
    onYouTubeIframeAPIReady: () => void
  }
}

const YT_API_LOADED = 'yt_api_loaded'

export function useYouTubePlayer(videoId: string | null): UseYouTubePlayerReturn {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<YouTubePlayerState>({
    player: null,
    isReady: false,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    volume: 1,
    error: null,
  })
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const seekUntilRef = useRef(0)
  const createTokenRef = useRef(0)

  const loadAPI = useCallback(() => {
    if (window.YT && window.YT.Player) return Promise.resolve()
    if (document.getElementById(YT_API_LOADED)) {
      return new Promise<void>(resolve => {
        const check = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(check)
            resolve()
          }
        }, 50)
      })
    }
    return new Promise<void>((resolve, reject) => {
      window.onYouTubeIframeAPIReady = () => resolve()
      const script = document.createElement('script')
      script.id = YT_API_LOADED
      script.src = 'https://www.youtube.com/iframe_api'
      script.onerror = () => reject(new Error('Failed to load YouTube IFrame API'))
      document.body.appendChild(script)
    })
  }, [])

  const startPolling = useCallback(() => {
    if (pollRef.current) return
    pollRef.current = setInterval(() => {
      if (Date.now() < seekUntilRef.current) return
      const player = playerRef.current
      if (player) {
        setState(s => ({
          ...s,
          currentTime: player.getCurrentTime(),
          duration: player.getDuration(),
        }))
      }
    }, 500)
  }, [])

  const onPlayerReady = useCallback((event: YTPlayerEvent) => {
    const player = event.target
    player.setVolume(100)
    setState(s => ({ ...s, player, isReady: true, duration: player.getDuration(), volume: 1 }))
    startPolling()
  }, [startPolling])

  const onPlayerStateChange = useCallback((event: YTPlayerEvent) => {
    const PlayerState = window.YT?.PlayerState
    if (!PlayerState) return

    if (event.data === PlayerState.PLAYING) {
      setState(s => (s.isPlaying ? s : { ...s, isPlaying: true }))
      if (!usePlayerStore.getState().isPlaying) usePlayerStore.getState().resume()
      return
    }

    if (event.data === PlayerState.PAUSED) {
      setState(s => (s.isPlaying ? { ...s, isPlaying: false } : s))
      if (usePlayerStore.getState().isPlaying) usePlayerStore.getState().pause()
      return
    }

    if (event.data === PlayerState.ENDED) {
      setState(s => (s.isPlaying ? { ...s, isPlaying: false } : s))
      const store = usePlayerStore.getState()
      if (store.repeat === 'one') {
        event.target.seekTo(0, true)
        event.target.playVideo()
        return
      }
      const activeId = store.currentTrack?.youtubeVideoId
      if (!activeId || activeId !== videoId) return
      store.next()
      const after = usePlayerStore.getState()
      if (after.isPlaying && after.currentTrack?.youtubeVideoId === videoId) {
        event.target.seekTo(0, true)
        event.target.playVideo()
      }
    }
  }, [videoId])

  const onPlayerError = useCallback((event: YTPlayerEvent) => {
    console.error('YouTube player error:', event.data)
    setState(s => ({ ...s, error: `YouTube error: ${event.data}` }))
  }, [])

  const createPlayer = useCallback(async () => {
    if (!videoId || !containerRef.current) return
    const token = ++createTokenRef.current
    await loadAPI()
    if (token !== createTokenRef.current || !containerRef.current) return

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        playsinline: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        fs: 0,
        disablekb: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError,
      },
    })
  }, [videoId, loadAPI, onPlayerReady, onPlayerStateChange, onPlayerError])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const play = useCallback(() => {
    playerRef.current?.playVideo()
  }, [])

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo()
  }, [])

  const seek = useCallback((seconds: number) => {
    if (!playerRef.current) return
    seekUntilRef.current = Date.now() + 600
    playerRef.current.seekTo(seconds, true)
    setState(s => ({ ...s, currentTime: seconds }))
  }, [])

  const setVolume = useCallback((vol: number) => {
    const v = Math.max(0, Math.min(1, vol)) * 100
    playerRef.current?.setVolume(v)
    setState(s => ({ ...s, volume: vol }))
  }, [])

  const destroy = useCallback(() => {
    createTokenRef.current++
    stopPolling()
    seekUntilRef.current = 0
    playerRef.current?.destroy()
    playerRef.current = null
    setState({
      player: null,
      isReady: false,
      isPlaying: false,
      duration: 0,
      currentTime: 0,
      volume: 1,
      error: null,
    })
  }, [stopPolling])

  useEffect(() => {
    if (videoId) {
      createPlayer()
    } else {
      // Use setTimeout to defer destroy to next tick
      setTimeout(() => destroy(), 0)
    }
    return () => destroy()
  }, [videoId, createPlayer, destroy])

  return {
    ...state,
    containerRef,
    play,
    pause,
    seek,
    setVolume,
    destroy,
  }
}

export function YouTubePlayer({ videoId, className = '', style }: { videoId: string | null; className?: string; style?: React.CSSProperties }) {
  const { containerRef } = useYouTubePlayer(videoId)

  if (!videoId) return null

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-w-[56px] min-h-[32px] ${className}`}
      style={{ ...style, backgroundColor: '#000' }}
      title="YouTube player"
    />
  )
}