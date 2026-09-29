export interface LocalMusicFile {
  id: string
  name: string
  path: string
  extension: string
  size: number
  lastModified: number
  duration: number
  title: string
  artist: string
  album: string
  albumArtist: string
  genre: string
  year: number
  trackNumber: number
  discNumber: number
  bitrate: number
  sampleRate: number
  artwork: string | null
  folderId: string
  inferred: boolean
  missing: boolean
  createdAt: number
  updatedAt: number
}

export interface LocalFolder {
  id: string
  name: string
  path: string
  handle: FileSystemDirectoryHandle | null
  addedAt: number
  lastScan: number
  trackCount: number
  albumCount: number
  artistCount: number
}

export interface LocalLibraryState {
  folders: LocalFolder[]
  tracks: LocalMusicFile[]
  artists: Map<string, { name: string; trackCount: number; albums: Set<string> }>
  albums: Map<string, { name: string; artist: string; trackCount: number; year: number; artwork: string | null }>
  genres: Map<string, { name: string; trackCount: number }>
  scanning: boolean
  scanProgress: number
  totalFiles: number
  lastUpdated: number
}

export type ViewMode = 'list' | 'grid'
export type FilterType = 'all' | 'tracks' | 'albums' | 'artists' | 'folders'

export interface ScanProgress {
  current: number
  total: number
  currentFile: string
}

export interface FileMetadata {
  title?: string
  artist?: string
  album?: string
  albumArtist?: string
  genre?: string
  year?: number
  trackNumber?: number
  discNumber?: number
  duration?: number
  bitrate?: number
  sampleRate?: number
  artwork?: Uint8Array | null
  inferred?: boolean
}