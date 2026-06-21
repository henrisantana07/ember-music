'use client'

import { create } from 'zustand'
import type { JamendoTrack } from '@/types/jamendo'

export type RepeatMode = 'none' | 'one' | 'all'

interface PlayerState {
  currentTrack: JamendoTrack | null
  isPlaying: boolean
  volume: number
  progress: number
  duration: number
  queue: JamendoTrack[]
  originalQueue: JamendoTrack[]
  shuffleOrder: number[]
  currentShuffleIndex: number
  currentPlaylistId: string | null
  currentPlaylistName: string | null
  repeat: RepeatMode
  shuffle: boolean
  crossfadeDuration: number
  sleepTimerMinutes: number | null
  miniPlayer: boolean

  play: ((track: JamendoTrack, queue?: JamendoTrack[], playlistId?: string, playlistName?: string) => void)
    & ((tracks: JamendoTrack[], index?: number, playlistId?: string, playlistName?: string) => void)
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
  setCurrentPlaylist: (id: string | null, name: string | null) => void
  setRepeat: (mode: RepeatMode) => void
  toggleShuffle: () => void
  setCrossfadeDuration: (seconds: number) => void
  setSleepTimer: (minutes: number | null) => void
  toggleMiniPlayer: () => void
}

function generateShuffleOrder(length: number, currentIndex: number): number[] {
  const indices = Array.from({ length }, (_, i) => i).filter((i) => i !== currentIndex)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return [currentIndex, ...indices]
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  progress: 0,
  duration: 0,
  queue: [],
  originalQueue: [],
  shuffleOrder: [],
  currentShuffleIndex: 0,
  currentPlaylistId: null,
  currentPlaylistName: null,
  repeat: 'none',
  shuffle: false,
  crossfadeDuration: 0,
  sleepTimerMinutes: null,
  miniPlayer: false,

  play: ((arg: JamendoTrack | JamendoTrack[], opt1?: unknown, opt2?: unknown, opt3?: unknown) => {
    const tracks = Array.isArray(arg) ? arg : (opt1 as JamendoTrack[] | undefined) ?? []
    const index = Array.isArray(arg) ? (opt1 as number | undefined) ?? 0 : tracks.findIndex((t) => t.id === arg.id)
    const track = Array.isArray(arg) ? (tracks[index] ?? tracks[0]) : arg
    const playlistId = Array.isArray(arg) ? (opt2 as string | undefined) : (opt2 as string | undefined)
    const playlistName = Array.isArray(arg) ? (opt3 as string | undefined) : (opt3 as string | undefined)

    const shuffle = get().shuffle
    const currentIndex = tracks.findIndex((t) => t.id === track.id)
    set({
      currentTrack: track,
      isPlaying: true,
      progress: 0,
      duration: 0,
      queue: tracks,
      originalQueue: tracks,
      currentPlaylistId: playlistId ?? null,
      currentPlaylistName: playlistName ?? null,
      shuffleOrder: shuffle ? generateShuffleOrder(tracks.length, Math.max(0, currentIndex)) : [],
      currentShuffleIndex: shuffle ? 0 : Math.max(0, currentIndex),
    })
  }) as PlayerState['play'],

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, currentTrack, repeat, shuffle, shuffleOrder, currentShuffleIndex } = get()
    if (queue.length === 0) return

    if (repeat === 'one') {
      set({ progress: 0, duration: 0 })
      return
    }

    if (shuffle && shuffleOrder.length > 0) {
      const nextIdx = currentShuffleIndex + 1
      if (nextIdx >= shuffleOrder.length) {
        if (repeat === 'all') {
          const newOrder = generateShuffleOrder(queue.length, -1)
          set({ currentTrack: queue[newOrder[0]], currentShuffleIndex: 0, shuffleOrder: newOrder, progress: 0, duration: 0 })
        }
        return
      }
      const trackIdx = shuffleOrder[nextIdx]
      if (trackIdx < queue.length) {
        set({ currentTrack: queue[trackIdx], isPlaying: true, currentShuffleIndex: nextIdx, progress: 0, duration: 0 })
      }
      return
    }

    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id)
    const nextIndex = currentIndex + 1
    if (nextIndex < queue.length) {
      set({ currentTrack: queue[nextIndex], isPlaying: true, progress: 0, duration: 0 })
    } else if (repeat === 'all' && queue.length > 0) {
      set({ currentTrack: queue[0], isPlaying: true, progress: 0, duration: 0 })
    }
  },

  prev: () => {
    const { queue, currentTrack, shuffle, shuffleOrder, currentShuffleIndex } = get()
    if (queue.length === 0) return

    if (shuffle && shuffleOrder.length > 0) {
      const prevIdx = currentShuffleIndex - 1
      if (prevIdx >= 0 && shuffleOrder[prevIdx] < queue.length) {
        set({ currentTrack: queue[shuffleOrder[prevIdx]], isPlaying: true, currentShuffleIndex: prevIdx, progress: 0, duration: 0 })
      }
      return
    }

    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id)
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      set({ currentTrack: queue[prevIndex], isPlaying: true, progress: 0, duration: 0 })
    }
  },

  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),

  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track], originalQueue: [...s.originalQueue, track] })),
  clearQueue: () => set({ queue: [], originalQueue: [], shuffleOrder: [], currentShuffleIndex: 0, currentPlaylistId: null, currentPlaylistName: null }),

  setCurrentPlaylist: (id, name) => set({ currentPlaylistId: id, currentPlaylistName: name }),

  setRepeat: (mode) => set({ repeat: mode }),

  toggleShuffle: () => {
    const { shuffle, queue, currentTrack } = get()
    if (shuffle) {
      set({ shuffle: false, shuffleOrder: [], currentShuffleIndex: 0 })
    } else {
      const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id)
      set({
        shuffle: true,
        shuffleOrder: generateShuffleOrder(queue.length, Math.max(0, currentIndex)),
        currentShuffleIndex: 0,
      })
    }
  },

  setCrossfadeDuration: (seconds) => set({ crossfadeDuration: seconds }),

  setSleepTimer: (minutes) => set({ sleepTimerMinutes: minutes }),

  toggleMiniPlayer: () => set((s) => ({ miniPlayer: !s.miniPlayer })),
}))
