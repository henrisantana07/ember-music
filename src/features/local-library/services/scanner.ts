'use client'

import { iterateFiles, verifyPermission } from '@/lib/filesystem'
import { extractMetadata, createArtworkDataUrl } from '@/lib/metadata'
import { saveMusicFiles, saveFolder, getAllMusicFiles, getMusicFilesByFolder, deleteMusicFilesByFolder } from '@/lib/database'
import { useLibraryStore } from '@/features/local-library/stores/library-store'
import type { LocalMusicFile, LocalFolder, ScanProgress } from '@/features/local-library/types'
import { generateId } from '@/lib/database'

const BATCH_SIZE = 50
const SUPPORTED_EXTENSIONS = ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.aac', '.opus', '.webm']

function isSupportedAudioFile(file: File): boolean {
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  return SUPPORTED_EXTENSIONS.includes(ext)
}

function parseFileName(fileName: string): { title?: string; artist?: string; album?: string; trackNumber?: number } {
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
  const parts = nameWithoutExt.split(/[-–—]/).map((p) => p.trim()).filter(Boolean)

  if (parts.length >= 3) {
    const trackNum = parseInt(parts[0], 10)
    if (!isNaN(trackNum)) {
      return { trackNumber: trackNum, artist: parts[1], title: parts.slice(2).join(' ') }
    }
    return { artist: parts[0], title: parts.slice(1).join(' ') }
  } else if (parts.length === 2) {
    const trackNum = parseInt(parts[0], 10)
    if (!isNaN(trackNum)) {
      return { trackNumber: trackNum, title: parts[1] }
    }
    return { artist: parts[0], title: parts[1] }
  }
  return { title: nameWithoutExt }
}

async function scanFolder(
  folder: LocalFolder,
  handle: FileSystemDirectoryHandle,
  onProgress: (progress: ScanProgress) => void,
  abortSignal: AbortSignal
): Promise<LocalMusicFile[]> {
  const existingFiles = await getMusicFilesByFolder(folder.id)
  const existingMap = new Map(existingFiles.map((f) => [f.path, f]))

  const newTracks: LocalMusicFile[] = []
  let processed = 0
  let totalFiles = 0

  const files: File[] = []
  for await (const file of iterateFiles(handle)) {
    if (isSupportedAudioFile(file)) {
      files.push(file)
    }
  }

  totalFiles = files.length
  onProgress({ current: 0, total: totalFiles, currentFile: '' })

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    if (abortSignal.aborted) break

    const batch = files.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        if (abortSignal.aborted) return null

        const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
        const existing = existingMap.get(relativePath)

        if (existing && existing.size === file.size && existing.lastModified === file.lastModified) {
          return existing
        }

        const metadata = await extractMetadata(file)
        const inferred = parseFileName(file.name)

        const track: LocalMusicFile = {
          id: existing?.id || generateId(),
          name: file.name,
          path: relativePath,
          extension: file.name.toLowerCase().substring(file.name.lastIndexOf('.')),
          size: file.size,
          lastModified: file.lastModified,
          duration: metadata.duration || 0,
          title: metadata.title || inferred.title || file.name,
          artist: metadata.artist || inferred.artist || 'Unknown Artist',
          album: metadata.album || inferred.album || 'Unknown Album',
          albumArtist: metadata.albumArtist || metadata.artist || 'Unknown Artist',
          genre: metadata.genre || '',
          year: metadata.year || 0,
          trackNumber: metadata.trackNumber || inferred.trackNumber || 0,
          discNumber: metadata.discNumber || 0,
          bitrate: metadata.bitrate || 0,
          sampleRate: metadata.sampleRate || 0,
          artwork: metadata.artwork ? createArtworkDataUrl(metadata.artwork) : null,
          folderId: folder.id,
          inferred: !!metadata.inferred,
          missing: false,
          createdAt: existing?.createdAt || Date.now(),
          updatedAt: Date.now(),
        }

        processed++
        onProgress({ current: processed, total: totalFiles, currentFile: file.name })
        return track
      })
    )

    const validTracks = batchResults.filter((t): t is LocalMusicFile => t !== null)
    newTracks.push(...validTracks)

    if (validTracks.length > 0) {
      await saveMusicFiles(validTracks)
    }
  }

  const currentPaths = new Set(newTracks.map((t) => t.path))
  for (const existing of existingFiles) {
    if (!currentPaths.has(existing.path)) {
      await useLibraryStore.getState().updateTrack(existing.id, { missing: true, updatedAt: Date.now() })
    }
  }

  return newTracks
}

export async function scanLibrary(
  folderId: string,
  handle: FileSystemDirectoryHandle,
  onProgress?: (progress: ScanProgress) => void
): Promise<void> {
  const store = useLibraryStore.getState()
  const folder = store.folders.find((f) => f.id === folderId)
  if (!folder) return

  const hasPermission = await verifyPermission(handle)
  if (!hasPermission) {
    throw new Error('Permission denied for folder access')
  }

  const abortController = new AbortController()
  store.setScanning(true)

  try {
    const progressCallback = onProgress || ((p) => store.setScanProgress(p))
    const tracks = await scanFolder(folder, handle, progressCallback, abortController.signal)

    const uniqueArtists = new Set(tracks.map((t) => t.artist).filter(Boolean))
    const uniqueAlbums = new Set(tracks.map((t) => t.album).filter(Boolean))

    await saveFolder({
      ...folder,
      lastScan: Date.now(),
      trackCount: tracks.length,
      albumCount: uniqueAlbums.size,
      artistCount: uniqueArtists.size,
    })

    store.updateFolder(folderId, {
      lastScan: Date.now(),
      trackCount: tracks.length,
      albumCount: uniqueAlbums.size,
      artistCount: uniqueArtists.size,
    })
  } finally {
    store.setScanning(false)
    store.setScanProgress({ current: 0, total: 0, currentFile: '' })
  }
}

export async function scanAllFolders(): Promise<void> {
  const store = useLibraryStore.getState()
  for (const folder of store.folders) {
    if (folder.handle) {
      await scanLibrary(folder.id, folder.handle)
    }
  }
}

export async function removeMissingTracks(folderId: string): Promise<void> {
  const tracks = await getMusicFilesByFolder(folderId)
  const missingTracks = tracks.filter((t) => t.missing)
  for (const track of missingTracks) {
    await useLibraryStore.getState().removeTrack(track.id)
  }
}