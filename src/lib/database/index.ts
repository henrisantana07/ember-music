import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { LocalMusicFile, LocalFolder, DirectoryNode } from '@/features/local-library/types'

interface StoredFolder {
  id: string
  name: string
  path: string
  addedAt: number
  lastScan: number
  trackCount: number
  albumCount: number
  artistCount: number
  needsReconnect: boolean
}

interface LocalLibraryDB extends DBSchema {
  musicFiles: {
    key: string
    value: LocalMusicFile
    indexes: { 'by-folder': string; 'by-artist': string; 'by-album': string; 'by-genre': string }
  }
  folders: {
    key: string
    value: StoredFolder
  }
  directoryTree: {
    key: string
    value: DirectoryNode
    indexes: { 'by-folder': string; 'by-parent': string }
  }
  metadata: {
    key: string
    value: { key: string; value: unknown }
  }
}

const DB_NAME = 'ember-local-library'
const DB_VERSION = 2

let dbInstance: IDBPDatabase<LocalLibraryDB> | null = null

export async function getDB(): Promise<IDBPDatabase<LocalLibraryDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<LocalLibraryDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('musicFiles')) {
        const musicStore = db.createObjectStore('musicFiles', { keyPath: 'id' })
        musicStore.createIndex('by-folder', 'folderId')
        musicStore.createIndex('by-artist', 'artist')
        musicStore.createIndex('by-album', 'album')
        musicStore.createIndex('by-genre', 'genre')
      }
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('directoryTree')) {
        const treeStore = db.createObjectStore('directoryTree', { keyPath: 'id' })
        treeStore.createIndex('by-folder', 'folderId')
        treeStore.createIndex('by-parent', 'parentId')
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' })
      }
    },
  })

  return dbInstance
}

export async function saveMusicFile(file: LocalMusicFile): Promise<void> {
  const db = await getDB()
  await db.put('musicFiles', file)
}

export async function saveMusicFiles(files: LocalMusicFile[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('musicFiles', 'readwrite')
  await Promise.all(files.map((file) => tx.store.put(file)))
  await tx.done
}

export async function getMusicFile(id: string): Promise<LocalMusicFile | undefined> {
  const db = await getDB()
  return db.get('musicFiles', id)
}

export async function getAllMusicFiles(): Promise<LocalMusicFile[]> {
  const db = await getDB()
  return db.getAll('musicFiles')
}

export async function getMusicFilesByFolder(folderId: string): Promise<LocalMusicFile[]> {
  const db = await getDB()
  return db.getAllFromIndex('musicFiles', 'by-folder', folderId)
}

export async function deleteMusicFile(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('musicFiles', id)
}

export async function deleteMusicFilesByFolder(folderId: string): Promise<void> {
  const db = await getDB()
  const files = await db.getAllFromIndex('musicFiles', 'by-folder', folderId)
  const tx = db.transaction('musicFiles', 'readwrite')
  await Promise.all(files.map((file) => tx.store.delete(file.id)))
  await tx.done
}

export async function saveFolder(folder: LocalFolder): Promise<void> {
  const db = await getDB()
  const { handle, ...folderData } = folder
  await db.put('folders', folderData)
}

export async function saveFolders(folders: LocalFolder[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('folders', 'readwrite')
  await Promise.all(folders.map((folder) => {
    const { handle, ...folderData } = folder
    tx.store.put(folderData)
  }))
  await tx.done
}

export async function getFolder(id: string): Promise<LocalFolder | undefined> {
  const db = await getDB()
  const stored = await db.get('folders', id)
  if (!stored) return undefined
  return { ...stored, handle: null }
}

export async function getAllFolders(): Promise<LocalFolder[]> {
  const db = await getDB()
  const stored = await db.getAll('folders')
  return stored.map((f) => ({ ...f, handle: null }))
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('folders', id)
}

export async function setMetadata(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('metadata', { key, value })
}

export async function getMetadata(key: string): Promise<unknown> {
  const db = await getDB()
  const result = await db.get('metadata', key)
  return result?.value
}

export async function clearDatabase(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['musicFiles', 'folders', 'directoryTree', 'metadata'], 'readwrite')
  await Promise.all([
    tx.objectStore('musicFiles').clear(),
    tx.objectStore('folders').clear(),
    tx.objectStore('directoryTree').clear(),
    tx.objectStore('metadata').clear(),
  ])
  await tx.done
}

export async function saveDirectoryTree(nodes: DirectoryNode[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('directoryTree', 'readwrite')
  await Promise.all(nodes.map((node) => tx.store.put(node)))
  await tx.done
}

export async function getDirectoryTreeByFolder(folderId: string): Promise<DirectoryNode[]> {
  const db = await getDB()
  return db.getAllFromIndex('directoryTree', 'by-folder', folderId)
}

export async function getDirectoryTreeByParent(folderId: string, parentId: string | null): Promise<DirectoryNode[]> {
  const db = await getDB()
  const allNodes = await db.getAllFromIndex('directoryTree', 'by-folder', folderId)
  return allNodes.filter((node) => node.parentId === parentId)
}

export async function getDirectoryNode(id: string): Promise<DirectoryNode | undefined> {
  const db = await getDB()
  return db.get('directoryTree', id)
}

export async function deleteDirectoryTreeByFolder(folderId: string): Promise<void> {
  const db = await getDB()
  const nodes = await db.getAllFromIndex('directoryTree', 'by-folder', folderId)
  const tx = db.transaction('directoryTree', 'readwrite')
  await Promise.all(nodes.map((node) => tx.store.delete(node.id)))
  await tx.done
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}