'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAllFolders, getAllMusicFiles, clearDatabase } from '@/lib/database'
import { scanAllFolders } from '@/features/local-library/services/scanner'
import { useLibraryStore } from '@/features/local-library/stores/library-store'
import type { LocalFolder, LocalMusicFile } from '@/features/local-library/types'

export function useLocalLibrary() {
  const {
    folders,
    tracks,
    scanning,
    scanProgress,
    viewMode,
    searchQuery,
    selectedTrackIds,
    setTracks,
    addFolder: storeAddFolder,
    removeFolder: storeRemoveFolder,
    updateFolder,
    reconnectFolder: storeReconnectFolder,
    setScanning,
    setScanProgress,
    setViewMode,
    setSearchQuery,
    toggleTrackSelection,
    clearSelection,
    selectAll,
  } = useLibraryStore()

  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const [storedFolders, storedTracks] = await Promise.all([
          getAllFolders(),
          getAllMusicFiles(),
        ])
        // Mark folders without handles as needing reconnection
        const foldersWithReconnect = storedFolders.map((f) => ({
          ...f,
          needsReconnect: !f.handle,
          handle: null, // Handles can't be persisted
        }))
        useLibraryStore.setState({ folders: foldersWithReconnect, tracks: storedTracks })
        setInitialized(true)
      } catch (error) {
        console.error('Failed to initialize library:', error)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const addFolder = useCallback(async (folder: { handle: FileSystemDirectoryHandle; name: string; path: string }) => {
    const folderId = await storeAddFolder({ handle: folder.handle, name: folder.name, path: folder.path })
    return folderId
  }, [storeAddFolder])

  const removeFolder = useCallback(async (folderId: string) => {
    await storeRemoveFolder(folderId)
  }, [storeRemoveFolder])

  const reconnectFolder = useCallback(async (folderId: string) => {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('File System Access API not supported')
    }
    try {
      const handle = await (window as Window & { showDirectoryPicker: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
        mode: 'read',
      })
      await storeReconnectFolder(folderId, handle)
      return handle
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to reconnect folder:', error)
      }
      throw error
    }
  }, [storeReconnectFolder])

  const startScan = useCallback(async (folderId?: string, handle?: FileSystemDirectoryHandle) => {
    if (folderId && handle) {
      const { scanLibrary } = await import('@/features/local-library/services/scanner')
      await scanLibrary(folderId, handle)
    } else if (folderId) {
      const folder = folders.find((f) => f.id === folderId)
      if (folder?.handle) {
        const { scanLibrary } = await import('@/features/local-library/services/scanner')
        await scanLibrary(folderId, folder.handle)
      }
    } else {
      await scanAllFolders()
    }
  }, [folders])

  const getFilteredTracks = useCallback((): LocalMusicFile[] => {
    let result = tracks

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          t.album.toLowerCase().includes(query) ||
          t.genre.toLowerCase().includes(query) ||
          t.name.toLowerCase().includes(query) ||
          t.path.toLowerCase().includes(query)
      )
    }

    return result
  }, [tracks, searchQuery])

  const getArtists = useCallback(() => {
    const artistMap = new Map<string, { name: string; trackCount: number; albums: Set<string> }>()
    tracks.forEach((t) => {
      if (!t.artist) return
      const existing = artistMap.get(t.artist) || { name: t.artist, trackCount: 0, albums: new Set<string>() }
      existing.trackCount++
      if (t.album) existing.albums.add(t.album)
      artistMap.set(t.artist, existing)
    })
    return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [tracks])

  const getAlbums = useCallback(() => {
    const albumMap = new Map<string, { name: string; artist: string; trackCount: number; year: number; artwork: string | null }>()
    tracks.forEach((t) => {
      if (!t.album) return
      const key = `${t.album}|${t.albumArtist}`
      const existing = albumMap.get(key) || { name: t.album, artist: t.albumArtist, trackCount: 0, year: t.year, artwork: t.artwork }
      existing.trackCount++
      if (t.artwork && !existing.artwork) existing.artwork = t.artwork
      albumMap.set(key, existing)
    })
    return Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [tracks])

  const getGenres = useCallback(() => {
    const genreMap = new Map<string, { name: string; trackCount: number }>()
    tracks.forEach((t) => {
      if (!t.genre) return
      const genres = t.genre.split(/[,;]/).map((g) => g.trim()).filter(Boolean)
      genres.forEach((g) => {
        const existing = genreMap.get(g) || { name: g, trackCount: 0 }
        existing.trackCount++
        genreMap.set(g, existing)
      })
    })
    return Array.from(genreMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [tracks])

  const getTracksByFolder = useCallback((folderId: string) => {
    return tracks.filter((t) => t.folderId === folderId)
  }, [tracks])

  const getTracksByArtist = useCallback((artist: string) => {
    return tracks.filter((t) => t.artist === artist)
  }, [tracks])

  const getTracksByAlbum = useCallback((album: string, artist: string) => {
    return tracks.filter((t) => t.album === album && t.albumArtist === artist)
  }, [tracks])

  return {
    folders,
    tracks,
    scanning,
    scanProgress,
    viewMode,
    searchQuery,
    selectedTrackIds,
    initialized,
    loading,
    addFolder,
    removeFolder,
    updateFolder,
    reconnectFolder,
    startScan,
    setViewMode,
    setSearchQuery,
    toggleTrackSelection,
    clearSelection,
    selectAll,
    getFilteredTracks,
    getArtists,
    getAlbums,
    getGenres,
    getTracksByFolder,
    getTracksByArtist,
    getTracksByAlbum,
  }
}