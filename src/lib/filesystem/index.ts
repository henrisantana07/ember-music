export interface DirectoryHandleResult {
  handle: FileSystemDirectoryHandle
  name: string
  path: string
}

export async function pickDirectory(): Promise<DirectoryHandleResult | null> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('File System Access API not supported')
  }

  try {
    const handle = await (window as Window & { showDirectoryPicker: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
      mode: 'read',
    })
    return {
      handle,
      name: handle.name,
      path: handle.name,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null
    }
    throw error
  }
}

export async function createMockHandle(name: string, files: File[]): Promise<FileSystemDirectoryHandle> {
  const fileMap = new Map<string, File>()
  files.forEach((file) => {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
    fileMap.set(relativePath, file)
  })

  const mockHandle = {
    kind: 'directory' as const,
    name,
    async getFileHandle(fileName: string) {
      const file = fileMap.get(fileName)
      if (!file) throw new DOMException('Not found', 'NotFoundError')
      return createMockFileHandle(file)
    },
    async getDirectoryHandle() {
      throw new DOMException('Not implemented', 'NotSupportedError')
    },
    async removeEntry() {
      throw new DOMException('Not implemented', 'NotSupportedError')
    },
    async resolve() {
      return []
    },
    async isSameEntry() {
      return false
    },
    async *[Symbol.asyncIterator]() {
      for (const entry of fileMap.entries()) {
        yield entry
      }
    },
  }

  return mockHandle as unknown as FileSystemDirectoryHandle
}

function createMockFileHandle(file: File): FileSystemFileHandle {
  const mockHandle = {
    kind: 'file' as const,
    name: file.name,
    async getFile() {
      return file
    },
    async createWritable() {
      throw new DOMException('Not implemented', 'NotSupportedError')
    },
    async isSameEntry() {
      return false
    },
  }

  return mockHandle as unknown as FileSystemFileHandle
}

export async function getDirectoryHandle(handle: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const parts = path.split('/').filter(Boolean)
    let current = handle
    for (const part of parts) {
      current = await current.getDirectoryHandle(part)
    }
    return current
  } catch {
    return null
  }
}

export async function *iterateFiles(handle: FileSystemDirectoryHandle): AsyncGenerator<File, void, unknown> {
  const entries = handle as unknown as { [Symbol.asyncIterator](): AsyncIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]> }
  for await (const [, entry] of entries) {
    if (entry.kind === 'file') {
      const file = await entry.getFile()
      yield file
    } else if (entry.kind === 'directory') {
      yield* iterateFiles(entry)
    }
  }
}

export function isAudioFile(file: File): boolean {
  const audioExtensions = ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.aac', '.opus', '.webm']
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  return audioExtensions.includes(extension)
}

export async function verifyPermission(handle: FileSystemDirectoryHandle, mode: 'read' | 'readwrite' = 'read'): Promise<boolean> {
  const h = handle as unknown as { queryPermission: (options: { mode: string }) => Promise<string>; requestPermission: (options: { mode: string }) => Promise<string> }
  if (!('queryPermission' in handle)) return true
  const permission = await h.queryPermission({ mode })
  if (permission === 'granted') return true
  const requested = await h.requestPermission({ mode })
  return requested === 'granted'
}