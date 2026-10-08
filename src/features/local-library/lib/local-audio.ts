import type { LocalFolder, LocalMusicFile } from '@/features/local-library/types'

/** Cache of object URLs keyed by track id, so replaying a track never leaks URLs. */
const objectUrlCache = new Map<string, string>()

function getFileHandleByPath(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemFileHandle> {
  // Mock handles (webkitdirectory) store the full relative path as a single key.
  // Real FS handles need the directory segments walked first.
  return root.getFileHandle(path).catch(async () => {
    const parts = path.split('/').filter(Boolean)
    const fileName = parts.pop()
    if (!fileName) throw new DOMException('Invalid path', 'NotFoundError')
    let dir: FileSystemDirectoryHandle = root
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part)
    }
    return dir.getFileHandle(fileName)
  })
}

/** Resolve a local track to its on-disk File via the folder's directory handle. */
export async function resolveLocalFile(
  track: LocalMusicFile,
  folders: LocalFolder[],
): Promise<File | null> {
  const folder = folders.find((f) => f.id === track.folderId)
  if (!folder?.handle) return null
  try {
    const fileHandle = await getFileHandleByPath(folder.handle, track.path)
    return await fileHandle.getFile()
  } catch {
    return null
  }
}

/**
 * Get a playable object URL for a local track.
 * Returns a cached URL when available; resolves the real File otherwise.
 * Falls back to an empty blob (which errors in <audio>) when the file
 * cannot be resolved, so the player still surfaces a failure instead of
 * silently playing nothing.
 */
export async function getAudioUrl(
  track: LocalMusicFile,
  folders: LocalFolder[],
): Promise<string> {
  const cached = objectUrlCache.get(track.id)
  if (cached) return cached

  const file = await resolveLocalFile(track, folders)
  if (!file) {
    return URL.createObjectURL(new Blob([], { type: 'audio/mpeg' }))
  }
  const url = URL.createObjectURL(file)
  objectUrlCache.set(track.id, url)
  return url
}

/** Convert a local track to a player track with a real (or fallback) audio URL. */
export async function localTrackToPlayerTrack(
  track: LocalMusicFile,
  folders: LocalFolder[],
) {
  const audio = await getAudioUrl(track, folders)
  return {
    id: track.id,
    name: track.title,
    duration: Math.floor(track.duration || 0),
    artist_id: track.artist,
    artist_name: track.artist,
    album_id: track.album,
    album_name: track.album,
    image: track.artwork || '/placeholder.svg',
    audio,
    url: '',
    localPath: track.path,
    localFile: track,
  } as const
}

/** Resolve many local tracks in parallel, preserving order. */
export async function localTracksToPlayerTracks(
  tracks: LocalMusicFile[],
  folders: LocalFolder[],
) {
  return Promise.all(tracks.map((t) => localTrackToPlayerTrack(t, folders)))
}
