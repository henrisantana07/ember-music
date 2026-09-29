'use client'

import { useRef } from 'react'
import { FolderPlus, RefreshCw, Search, X } from 'lucide-react'
import { useLocalLibrary } from '@/features/local-library/hooks/use-local-library'
import { pickDirectory } from '@/lib/filesystem'

export function LocalLibraryHeader() {
  const {
    scanning,
    scanProgress,
    searchQuery,
    setSearchQuery,
    startScan,
    addFolder,
    folders,
  } = useLocalLibrary()

  const legacyInputRef = useRef<HTMLInputElement>(null)

  const handleLegacyFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const firstFile = files[0]
    const path = (firstFile as File & { webkitRelativePath?: string }).webkitRelativePath || firstFile.name
    const folderName = path.split('/')[0]

    const { createMockHandle } = await import('@/lib/filesystem')
    const handle = await createMockHandle(folderName, files)
    
    const folderId = await addFolder({ handle, name: folderName, path: folderName })
    await startScan(folderId, handle)
    
    e.target.value = ''
  }

  const handleAddFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      legacyInputRef.current?.click()
      return
    }

    try {
      const result = await pickDirectory()
      if (result) {
        const folderId = await addFolder({ handle: result.handle, name: result.name, path: result.path })
        await startScan(folderId, result.handle)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to add folder:', error)
      }
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">Biblioteca Local</h1>
        {folders.length > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            {folders.length} pasta{folders.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center">
        <button
          onClick={handleAddFolder}
          disabled={scanning}
          className="btn-primary text-sm flex items-center gap-2"
          style={{ minWidth: '140px', justifyContent: 'center' }}
        >
          <FolderPlus className="w-4 h-4" />
          Adicionar pasta
        </button>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-disabled)' }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar na biblioteca..."
            className="w-full pl-10 pr-10 py-2 rounded-lg text-sm border-none focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              boxShadow: '0 0 0 2px var(--accent-solid)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {scanning && (
        <div className="w-full sm:w-auto flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex-1 max-w-xs h-2 rounded overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded"
              style={{
                width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%`,
                background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                transition: 'width 200ms ease',
              }}
            />
          </div>
          <span className="whitespace-nowrap">
            {scanProgress.current}/{scanProgress.total} - {scanProgress.currentFile}
          </span>
        </div>
      )}

      <input
        ref={legacyInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory
        multiple
        onChange={handleLegacyFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  )
}