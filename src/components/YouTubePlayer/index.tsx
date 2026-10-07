'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

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

interface YT {
  Player: new (element: HTMLElement, options: { videoId: string; playerVars: Record<string, unknown>; events: Record<string, Function> }) => YTPlayer
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

  const createPlayer = useCallback(async () => {
    if (!videoId || !containerRef.current) return
    await loadAPI()
    if (!containerRef.current) return

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
  }, [videoId, loadAPI])

  const startPolling = useCallback(() => {
    if (pollRef.current) return
    pollRef.current = setInterval(() => {
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

  interface YTPlayerEvent {
  target: YTPlayer
  data: number
}

  const onPlayerReady = useCallback((event: YTPlayerEvent) => {
    const player = event.target
    player.setVolume(100)
    setState(s => ({ ...s, player, isReady: true, duration: player.getDuration(), volume: 1 }))
    startPolling()
  }, [startPolling])

  const onPlayerStateChange = useCallback((event: YTPlayerEvent) => {
    const player = event.target
    if (event.data === window.YT.PlayerState.PLAYING) {
      setState(s => ({ ...s, isPlaying: true }))
    } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
      setState(s => ({ ...s, isPlaying: false }))
      if (event.data === window.YT.PlayerState.ENDED) {
        // ended handled by parent
      }
    }
  }, [])

  const onPlayerError = useCallback((event: YTPlayerEvent) => {
    console.error('YouTube player error:', event.data)
    setState(s => ({ ...s, error: `YouTube error: ${event.data}` }))
  }, [])

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
    playerRef.current?.seekTo(seconds, true)
    setState(s => ({ ...s, currentTime: seconds }))
  }, [])

  const setVolume = useCallback((vol: number) => {
    const v = Math.max(0, Math.min(1, vol)) * 100
    playerRef.current?.setVolume(v)
    setState(s => ({ ...s, volume: vol }))
  }, [])

  const destroy = useCallback(() => {
    stopPolling()
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
    play,
    pause,
    seek,
    setVolume,
    destroy,
  }
}

export function YouTubePlayer({ videoId, className = '', style }: { videoId: string | null; className?: string; style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isReady } = useYouTubePlayer(videoId)

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