'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: Record<string, unknown>) => YouTubePlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
      ready: boolean
    }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YouTubePlayer {
  loadVideoById: (videoId: string) => void
  cueVideoById: (videoId: string) => void
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  destroy: () => void
}

export function useYouTubePlayer() {
  const [apiReady, setApiReady] = useState(false)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const containerId = 'youtube-player-container'

  useEffect(() => {
    if (window.YT?.ready) {
      setApiReady(true)
      return
    }

    if (document.querySelector('#youtube-iframe-api')) return

    const tag = document.createElement('script')
    tag.id = 'youtube-iframe-api'
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    document.head.appendChild(tag)

    window.onYouTubeIframeAPIReady = () => {
      setApiReady(true)
    }
  }, [])

  const createPlayer = useCallback((videoId: string) => {
    if (!window.YT) return

    const existing = document.getElementById(containerId)
    if (existing) existing.innerHTML = ''

    const div = document.createElement('div')
    div.id = 'youtube-player'
    document.getElementById(containerId)?.appendChild(div)

    playerRef.current = new window.YT.Player('youtube-player', {
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onStateChange: () => {},
      },
    })
  }, [])

  const play = useCallback((videoId: string) => {
    if (playerRef.current) {
      playerRef.current.loadVideoById(videoId)
    } else {
      createPlayer(videoId)
    }
  }, [createPlayer])

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo()
  }, [])

  const stop = useCallback(() => {
    playerRef.current?.stopVideo()
  }, [])

  const destroy = useCallback(() => {
    playerRef.current?.destroy()
    playerRef.current = null
  }, [])

  return { apiReady, containerId, playerRef, play, pause, stop, destroy }
}
