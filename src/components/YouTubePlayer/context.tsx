'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import { usePlayerStore } from '@/lib/store'
import { useYouTubePlayer } from './index'

interface OverlayRect {
  left: number
  top: number
  width: number
  height: number
}

export interface YouTubeContextValue {
  isYouTubeTrack: boolean
  videoId: string | null
  isReady: boolean
  isPlaying: boolean
  error: string | null
  seek: (seconds: number) => void
  setOverlayTarget: (el: HTMLElement | null) => void
  getCurrentTime: () => number
  getDuration: () => number
}

export interface YouTubeTimeValue {
  currentTime: number
  duration: number
}

const YouTubeContext = createContext<YouTubeContextValue | null>(null)
const YouTubeTimeContext = createContext<YouTubeTimeValue>({ currentTime: 0, duration: 0 })

export function useYouTube(): YouTubeContextValue {
  const ctx = useContext(YouTubeContext)
  if (!ctx) throw new Error('useYouTube deve ser usado dentro de YouTubePlayerProvider')
  return ctx
}

export function useYouTubeTime(): YouTubeTimeValue {
  return useContext(YouTubeTimeContext)
}

function applyHidden(el: HTMLDivElement) {
  el.style.position = 'fixed'
  el.style.left = '0px'
  el.style.top = '0px'
  el.style.width = '1px'
  el.style.height = '1px'
  el.style.opacity = '0'
  el.style.overflow = 'hidden'
  el.style.pointerEvents = 'none'
  el.style.zIndex = '-1'
  el.style.borderRadius = '0px'
  el.style.backgroundColor = '#000'
}

function applyOverlay(el: HTMLDivElement, rect: OverlayRect) {
  el.style.position = 'fixed'
  el.style.left = `${rect.left}px`
  el.style.top = `${rect.top}px`
  el.style.width = `${rect.width}px`
  el.style.height = `${rect.height}px`
  el.style.opacity = '1'
  el.style.overflow = 'hidden'
  el.style.pointerEvents = 'none'
  el.style.zIndex = '70'
  el.style.borderRadius = '16px'
  el.style.backgroundColor = '#000'
}

export function YouTubePlayerProvider({ children }: { children: ReactNode }) {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const storeIsPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)

  const isYouTubeTrack = currentTrack?.source === 'youtube' && !!currentTrack.youtubeVideoId
  const videoId = isYouTubeTrack ? (currentTrack?.youtubeVideoId ?? null) : null

  const yt = useYouTubePlayer(videoId)
  const {
    containerRef, isReady: ytIsReady, isPlaying: ytIsPlaying,
    currentTime: ytCurrentTime, duration: ytDuration, error: ytError,
    play: ytPlay, pause: ytPause, seek: ytSeek, setVolume: ytSetVolume,
  } = yt

  const stageRef = useRef<HTMLDivElement>(null)
  const [overlayTarget, setOverlayTarget] = useState<HTMLElement | null>(null)

  const timeRef = useRef({ currentTime: 0, duration: 0 })
  timeRef.current.currentTime = ytCurrentTime
  timeRef.current.duration = ytDuration

  const getCurrentTime = useCallback(() => timeRef.current.currentTime, [])
  const getDuration = useCallback(() => timeRef.current.duration, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    let lastRect = ''

    const sync = () => {
      if (!overlayTarget || !overlayTarget.isConnected) {
        if (lastRect !== 'hidden') {
          applyHidden(stage)
          lastRect = 'hidden'
        }
        return
      }
      const r = overlayTarget.getBoundingClientRect()
      const key = `${r.left},${r.top},${r.width},${r.height}`
      if (key === lastRect) return
      lastRect = key
      applyOverlay(stage, { left: r.left, top: r.top, width: r.width, height: r.height })
    }

    sync()
    if (!overlayTarget) return

    let raf = requestAnimationFrame(function loop() {
      sync()
      raf = requestAnimationFrame(loop)
    })
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
      applyHidden(stage)
    }
  }, [overlayTarget])

  useEffect(() => {
    if (!videoId || !ytIsReady) return
    if (ytIsPlaying === storeIsPlaying) return
    if (storeIsPlaying) ytPlay()
    else ytPause()
  }, [videoId, ytIsReady, ytIsPlaying, storeIsPlaying, ytPlay, ytPause])

  useEffect(() => {
    if (!ytIsReady) return
    ytSetVolume(volume)
  }, [volume, ytIsReady, ytSetVolume])

  const seek = useCallback(
    (seconds: number) => {
      if (!ytIsReady) return
      ytSeek(seconds)
    },
    [ytIsReady, ytSeek]
  )

  const stableValue = useMemo<YouTubeContextValue>(
    () => ({
      isYouTubeTrack: !!isYouTubeTrack,
      videoId,
      isReady: ytIsReady,
      isPlaying: ytIsPlaying,
      error: ytError,
      seek,
      setOverlayTarget,
      getCurrentTime,
      getDuration,
    }),
    [isYouTubeTrack, videoId, ytIsReady, ytIsPlaying, ytError, seek, getCurrentTime, getDuration]
  )

  const timeValue = useMemo<YouTubeTimeValue>(
    () => ({ currentTime: ytCurrentTime, duration: ytDuration }),
    [ytCurrentTime, ytDuration]
  )

  return (
    <YouTubeContext.Provider value={stableValue}>
      <YouTubeTimeContext.Provider value={timeValue}>
        {children}
      </YouTubeTimeContext.Provider>
      <div ref={stageRef} style={{ position: 'fixed', left: 0, top: 0, width: 1, height: 1, opacity: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }} aria-hidden="true" data-ember-yt-stage="">
        <div ref={containerRef} className="w-full h-full block" title="YouTube player" />
      </div>
    </YouTubeContext.Provider>
  )
}
