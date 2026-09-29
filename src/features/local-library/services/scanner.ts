'use client'

import { iterateFiles, verifyPermission } from '@/lib/filesystem'
import { extractMetadata, createArtworkDataUrl } from '@/lib/metadata'
import { saveMusicFiles, saveFolder, getAllMusicFiles, getMusicFilesByFolder, deleteMusicFilesByFolder, saveDirectoryTree, deleteDirectoryTreeByFolder } from '@/lib/database'
import { useLibraryStore } from '@/features/local-library/stores/library-store'
import type { LocalMusicFile, LocalFolder, ScanProgress, DirectoryNode } from '@/features/local-library/types'
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

async function buildDirectoryTree(
  folder: LocalFolder,
  handle: FileSystemDirectoryHandle,
  tracks: LocalMusicFile[]
): Promise<DirectoryNode[]> {
  const pathToNode = new Map<string, DirectoryNode>()
  const rootId = generateId()
  
  // Create root node
  const rootNode: DirectoryNode = {
    id: rootId,
    name: folder.name,
    path: '',
    parentId: null,
    folderId: folder.id,
    children: [],
    trackCount: 0,
    hasChildren: false,
  }
  pathToNode.set('', rootNode)

  // Group tracks by directory path
  const dirTrackCount = new Map<string, number>()
  for (const track of tracks) {
    const dirPath = track.path.substring(0, track.path.lastIndexOf('/'))
    const currentCount = dirTrackCount.get(dirPath) || 0
    dirTrackCount.set(dirPath, currentCount + 1)
  }

  // Create nodes for all directory paths
  const allDirPaths = new Set<string>()
  for (const track of tracks) {
    const dirPath = track.path.substring(0, track.path.lastIndexOf('/'))
    if (dirPath) {
      let currentPath = ''
      const parts = dirPath.split('/')
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        allDirPaths.add(currentPath)
      }
    }
  }

  // Create nodes in order (parents first)
  const sortedPaths = Array.from(allDirPaths).sort((a, b) => a.split('/').length - b.split('/').length)
  
  for (const dirPath of sortedPaths) {
    const parts = dirPath.split('/')
    const name = parts[parts.length - 1]
    const parentPath = parts.slice(0, -1).join('/')
    const parentId = pathToNode.get(parentPath)?.id || rootId
    
    const node: DirectoryNode = {
      id: generateId(),
      name,
      path: dirPath,
      parentId,
      folderId: folder.id,
      children: [],
      trackCount: dirTrackCount.get(dirPath) || 0,
      hasChildren: false,
    }
    pathToNode.set(dirPath, node)
  }

  // Build children arrays and update hasChildren
  for (const [path, node] of pathToNode) {
    if (node.parentId) {
      const parent = pathToNode.get(node.parentId === rootId ? '' : path.substring(0, path.lastIndexOf('/')))
      if (parent) {
        parent.children.push(node)
        parent.hasChildren = true
      }
    }
  }

  // Update track counts for parent directories (aggregate)
  const updateTrackCounts = (node: DirectoryNode): number => {
    let total = node.trackCount
    for (const child of node.children) {
      total += updateTrackCounts(child)
    }
    node.trackCount = total
    return total
  }
  updateTrackCounts(rootNode)

  // Convert to array for storage
  return Array.from(pathToNode.values())
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

  // Build and save directory tree
  const allTracks = [...existingFiles.filter(e => currentPaths.has(e.path)), ...newTracks]
  const treeNodes = await buildDirectoryTree(folder, handle, allTracks)
  await saveDirectoryTree(treeNodes)

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

  if (!folder.handle) {
    store.updateFolder(folderId, { needsReconnect: true })
    throw new Error('Folder needs reconnection. Please reconnect the folder first.')
  }

  const hasPermission = await verifyPermission(handle)
  if (!hasPermission) {
    store.updateFolder(folderId, { needsReconnect: true })
    throw new Error('Permission denied for folder access')
  }

  const abortController = new AbortController()
  store.setScanning(true)

  try {
    const progressCallback = onProgress || ((p) => store.setScanProgress(p))
    const tracks = await scanFolder(folder, handle, progressCallback, abortController.signal)

    const uniqueArtists = new Set(tracks.map((t) => t.artist).filter(Boolean))
    const uniqueAlbums = new Set(tracks.map((t) => t.album).filter(Boolean))

    // Update Zustand store immediately so UI reflects new tracks
    store.addTracks(tracks)

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
    if (folder.handle && !folder.needsReconnect) {
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