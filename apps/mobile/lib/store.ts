import { create } from 'zustand'
import type { Track, RepeatMode } from './types'

interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  volume: number
  progress: number
  duration: number
  queue: Track[]
  originalQueue: Track[]
  shuffleOrder: number[]
  currentShuffleIndex: number
  currentPlaylistId: string | null
  currentPlaylistName: string | null
  repeat: RepeatMode
  shuffle: boolean
  crossfadeDuration: number
  sleepTimerMinutes: number | null
  miniPlayer: boolean
}

interface PlayerActions {
  play: (track: Track, queue?: Track[], startIndex?: number) => void
  pause: () => void
  resume: () => void
  togglePlay: () => void
  next: () => void
  prev: () => void
  setVolume: (v: number) => void
  setProgress: (v: number) => void
  setDuration: (v: number) => void
  addToQueue: (tracks: Track | Track[]) => void
  removeFromQueue: (index: number) => void
  reorderQueue: (from: number, to: number) => void
  clearQueue: () => void
  setCurrentPlaylist: (id: string | null, name: string | null) => void
  setRepeat: (mode: RepeatMode) => void
  toggleShuffle: () => void
  setCrossfadeDuration: (v: number) => void
  setSleepTimer: (minutes: number | null) => void
  toggleMiniPlayer: () => void
}

const shuffleArray = (arr: number[]): number[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  queue: [],
  originalQueue: [],
  shuffleOrder: [],
  currentShuffleIndex: -1,
  currentPlaylistId: null,
  currentPlaylistName: null,
  repeat: 'none',
  shuffle: false,
  crossfadeDuration: 0,
  sleepTimerMinutes: null,
  miniPlayer: false,

  play: (track, queue, startIndex) => {
    const newQueue = queue || [track]
    const idx = startIndex ?? (queue ? queue.findIndex(t => t.id === track.id) : 0)
    const order = shuffleArray(newQueue.map((_, i) => i))
    set({
      currentTrack: track,
      isPlaying: true,
      queue: newQueue,
      originalQueue: newQueue,
      shuffleOrder: order,
      currentShuffleIndex: order.indexOf(idx >= 0 ? idx : 0),
      progress: 0,
      miniPlayer: true,
    })
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { shuffle, shuffleOrder, currentShuffleIndex, queue, repeat, currentTrack } = get()
    if (!currentTrack || queue.length === 0) return
    let nextIndex = shuffle
      ? (currentShuffleIndex + 1) % shuffleOrder.length
      : (queue.findIndex(t => t.id === currentTrack.id) + 1) % queue.length
    if (repeat === 'none' && nextIndex === 0) {
      set({ isPlaying: false, miniPlayer: false })
      return
    }
    const nextTrack = shuffle ? queue[shuffleOrder[nextIndex]] : queue[nextIndex]
    set({
      currentTrack: nextTrack,
      currentShuffleIndex: nextIndex,
      progress: 0,
      isPlaying: true,
    })
  },

  prev: () => {
    const { shuffle, shuffleOrder, currentShuffleIndex, queue, currentTrack } = get()
    if (!currentTrack || queue.length === 0) return
    let prevIndex = shuffle
      ? (currentShuffleIndex - 1 + shuffleOrder.length) % shuffleOrder.length
      : (queue.findIndex(t => t.id === currentTrack.id) - 1 + queue.length) % queue.length
    const prevTrack = shuffle ? queue[shuffleOrder[prevIndex]] : queue[prevIndex]
    set({
      currentTrack: prevTrack,
      currentShuffleIndex: prevIndex,
      progress: 0,
      isPlaying: true,
    })
  },

  setVolume: v => set({ volume: Math.max(0, Math.min(1, v)) }),
  setProgress: v => set({ progress: v }),
  setDuration: v => set({ duration: v }),

  addToQueue: tracks => {
    const { queue } = get()
    const t = Array.isArray(tracks) ? tracks : [tracks]
    set({ queue: [...queue, ...t], originalQueue: [...queue, ...t] })
  },

  removeFromQueue: index => {
    const { queue } = get()
    const newQ = queue.filter((_, i) => i !== index)
    set({ queue: newQ, originalQueue: newQ })
  },

  reorderQueue: (from, to) => {
    const { queue } = get()
    const newQ = [...queue]
    const [moved] = newQ.splice(from, 1)
    newQ.splice(to, 0, moved)
    set({ queue: newQ, originalQueue: newQ })
  },

  clearQueue: () => set({ queue: [], originalQueue: [], shuffleOrder: [], currentShuffleIndex: -1 }),
  setCurrentPlaylist: (id, name) => set({ currentPlaylistId: id, currentPlaylistName: name }),
  setRepeat: mode => set({ repeat: mode }),
  toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),
  setCrossfadeDuration: v => set({ crossfadeDuration: v }),
  setSleepTimer: minutes => set({ sleepTimerMinutes: minutes }),
  toggleMiniPlayer: () => set(s => ({ miniPlayer: !s.miniPlayer })),
}))
