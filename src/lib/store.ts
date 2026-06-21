'use client'

import { create } from 'zustand'
import type { JamendoTrack } from '@/types/jamendo'

interface PlayerState {
  currentTrack: JamendoTrack | null
  isPlaying: boolean
  volume: number
  progress: number
  duration: number
  queue: JamendoTrack[]

  play: (track: JamendoTrack, queue?: JamendoTrack[]) => void
  pause: () => void
  resume: () => void
  togglePlay: () => void
  next: () => void
  prev: () => void
  setVolume: (volume: number) => void
  setProgress: (progress: number) => void
  setDuration: (duration: number) => void
  addToQueue: (track: JamendoTrack) => void
  clearQueue: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  progress: 0,
  duration: 0,
  queue: [],

  play: (track, queue) => {
    set({
      currentTrack: track,
      isPlaying: true,
      progress: 0,
      duration: 0,
      queue: queue ?? [],
    })
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, currentTrack } = get()
    if (queue.length === 0) return
    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id)
    const nextIndex = currentIndex + 1
    if (nextIndex < queue.length) {
      set({ currentTrack: queue[nextIndex], isPlaying: true, progress: 0, duration: 0 })
    }
  },

  prev: () => {
    const { queue, currentTrack } = get()
    if (queue.length === 0) return
    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id)
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      set({ currentTrack: queue[prevIndex], isPlaying: true, progress: 0, duration: 0 })
    }
  },

  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),

  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
  clearQueue: () => set({ queue: [] }),
}))
