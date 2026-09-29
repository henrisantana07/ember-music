import * as mm from 'music-metadata'
import type { FileMetadata } from '@/features/local-library/types'

const SUPPORTED_MIME_TYPES = [
  'audio/mpeg',
  'audio/flac',
  'audio/wav',
  'audio/mp4',
  'audio/ogg',
  'audio/aac',
  'audio/opus',
  'audio/webm',
  'audio/x-m4a',
]

export async function extractMetadata(file: File): Promise<FileMetadata> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const metadata = await mm.parseBuffer(buffer, file.type || getMimeFromExtension(file.name), { duration: true })

    const result: FileMetadata = {
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      albumArtist: metadata.common.albumartist,
      genre: metadata.common.genre?.[0],
      year: metadata.common.year ?? undefined,
      trackNumber: metadata.common.track?.no ?? undefined,
      discNumber: metadata.common.disk?.no ?? undefined,
      duration: metadata.format.duration,
      bitrate: metadata.format.bitrate,
      sampleRate: metadata.format.sampleRate,
      artwork: getArtwork(metadata.common.picture),
    }

    if (!result.title || !result.artist || !result.album) {
      const inferred = inferFromFileName(file.name)
      result.inferred = true
      result.title = result.title || inferred.title
      result.artist = result.artist || inferred.artist
      result.album = result.album || inferred.album
      result.trackNumber = result.trackNumber || inferred.trackNumber
    }

    return result
  } catch (error) {
    console.warn(`Failed to extract metadata from ${file.name}:`, error)
    return inferFromFileName(file.name)
  }
}

function getMimeFromExtension(fileName: string): string {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  switch (ext) {
    case '.mp3': return 'audio/mpeg'
    case '.flac': return 'audio/flac'
    case '.wav': return 'audio/wav'
    case '.m4a': return 'audio/mp4'
    case '.ogg': return 'audio/ogg'
    case '.aac': return 'audio/aac'
    case '.opus': return 'audio/opus'
    case '.webm': return 'audio/webm'
    default: return 'audio/mpeg'
  }
}

function getArtwork(pictures: mm.IPicture[] | undefined): Uint8Array | null {
  if (!pictures || pictures.length === 0) return null
  const cover = pictures.find((p) => p.type === 'Cover (front)') || pictures[0]
  if (!cover) return null
  return new Uint8Array(cover.data)
}

function inferFromFileName(fileName: string): FileMetadata {
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
  const parts = nameWithoutExt.split(/[-–—]/).map((p) => p.trim()).filter(Boolean)

  const result: FileMetadata = { inferred: true }

  if (parts.length >= 3) {
    const trackNum = parseInt(parts[0], 10)
    if (!isNaN(trackNum)) {
      result.trackNumber = trackNum
      result.artist = parts[1]
      result.title = parts.slice(2).join(' ')
    } else {
      result.artist = parts[0]
      result.title = parts.slice(1).join(' ')
    }
  } else if (parts.length === 2) {
    const trackNum = parseInt(parts[0], 10)
    if (!isNaN(trackNum)) {
      result.trackNumber = trackNum
      result.title = parts[1]
    } else {
      result.artist = parts[0]
      result.title = parts[1]
    }
  } else {
    result.title = nameWithoutExt
  }

  return result
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function createArtworkDataUrl(artwork: Uint8Array | null, mimeType = 'image/jpeg'): string | null {
  if (!artwork) return null
  const buffer = artwork.buffer instanceof ArrayBuffer ? artwork.buffer : new Uint8Array(artwork).buffer
  const base64 = arrayBufferToBase64(buffer)
  return `data:${mimeType};base64,${base64}`
}