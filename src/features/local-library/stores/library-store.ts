'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LocalMusicFile, LocalFolder, ViewMode, FilterType, ScanProgress } from '@/features/local-library/types'
import { generateId } from '@/lib/database'

interface LibraryState {
  folders: LocalFolder[]
  tracks: LocalMusicFile[]
  scanning: boolean
  scanProgress: ScanProgress
  viewMode: ViewMode
  filter: FilterType
  searchQuery: string
  selectedTrackIds: Set<string>
  lastUpdated: number

  addFolder: (folder: Omit<LocalFolder, 'id' | 'addedAt' | 'lastScan' | 'trackCount' | 'albumCount' | 'artistCount' | 'needsReconnect'>) => Promise<string>
  removeFolder: (folderId: string) => Promise<void>
  updateFolder: (folderId: string, data: Partial<LocalFolder>) => void
  reconnectFolder: (folderId: string, handle: FileSystemDirectoryHandle) => Promise<void>
  setTracks: (tracks: LocalMusicFile[]) => void
  addTracks: (tracks: LocalMusicFile[]) => void
  updateTrack: (id: string, data: Partial<LocalMusicFile>) => void
  removeTrack: (id: string) => void
  removeTracksByFolder: (folderId: string) => void
  setScanning: (scanning: boolean) => void
  setScanProgress: (progress: ScanProgress) => void
  setViewMode: (mode: ViewMode) => void
  setFilter: (filter: FilterType) => void
  setSearchQuery: (query: string) => void
  toggleTrackSelection: (id: string) => void
  clearSelection: () => void
  selectAll: (ids: string[]) => void
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      folders: [],
      tracks: [],
      scanning: false,
      scanProgress: { current: 0, total: 0, currentFile: '' },
      viewMode: 'list',
      filter: 'all',
      searchQuery: '',
      selectedTrackIds: new Set(),
      lastUpdated: 0,

      addFolder: async (folder) => {
        const id = generateId()
        const newFolder: LocalFolder = {
          ...folder,
          id,
          addedAt: Date.now(),
          lastScan: 0,
          trackCount: 0,
          albumCount: 0,
          artistCount: 0,
          needsReconnect: false,
        }
        set((state) => ({ folders: [...state.folders, newFolder] }))
        return id
      },

      removeFolder: async (folderId) => {
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== folderId),
          tracks: state.tracks.filter((t) => t.folderId !== folderId),
        }))
      },

      updateFolder: (folderId, data) =>
        set((state) => ({
          folders: state.folders.map((f) => (f.id === folderId ? { ...f, ...data } : f)),
        })),

      reconnectFolder: async (folderId: string, handle: FileSystemDirectoryHandle): Promise<void> => {
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === folderId ? { ...f, handle, needsReconnect: false } : f
          ),
        }))
      },

      setTracks: (tracks) => set({ tracks, lastUpdated: Date.now() }),

      addTracks: (newTracks) =>
        set((state) => {
          const existingIds = new Set(state.tracks.map((t) => t.id))
          const uniqueTracks = newTracks.filter((t) => !existingIds.has(t.id))
          return { tracks: [...state.tracks, ...uniqueTracks], lastUpdated: Date.now() }
        }),

      updateTrack: (id, data) =>
        set((state) => ({
          tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...data, updatedAt: Date.now() } : t)),
          lastUpdated: Date.now(),
        })),

      removeTrack: (id) =>
        set((state) => ({
          tracks: state.tracks.filter((t) => t.id !== id),
          selectedTrackIds: new Set([...state.selectedTrackIds].filter((selectedId) => selectedId !== id)),
        })),

      removeTracksByFolder: (folderId) =>
        set((state) => ({
          tracks: state.tracks.filter((t) => t.folderId !== folderId),
          selectedTrackIds: new Set([...state.selectedTrackIds].filter((selectedId) => !state.tracks.find((t) => t.id === selectedId && t.folderId === folderId))),
        })),

      setScanning: (scanning) => set({ scanning }),

      setScanProgress: (progress) => set({ scanProgress: progress }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setFilter: (filter) => set({ filter }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      toggleTrackSelection: (id) =>
        set((state) => {
          const newSelection = new Set(state.selectedTrackIds)
          if (newSelection.has(id)) {
            newSelection.delete(id)
          } else {
            newSelection.add(id)
          }
          return { selectedTrackIds: newSelection }
        }),

      clearSelection: () => set({ selectedTrackIds: new Set() }),

      selectAll: (ids) => set({ selectedTrackIds: new Set(ids) }),
    }),
    {
      name: 'local-library-store',
      partialize: (state) => ({
        folders: state.folders,
        viewMode: state.viewMode,
        filter: state.filter,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
)