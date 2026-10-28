'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export function Sidebar() {
  const router = useRouter()
  const [mode, setMode] = useState<'expanded' | 'collapsed'>('expanded')

  // Efeito para inicializar modo (sem dependência de data.modo)
  useEffect(() => {
    // Modo padrão expandido quando não há dados do sidebar.json
    setMode('expanded')
  }, [])

  return (
    <aside
      className={`w-64 h-screen bg-[var(--bg-surface)] flex flex-col transition-all duration-300 ${mode === 'collapsed' ? 'w-16' : 'w-64'}`}
    >
      {/* Header */}
      <header className="flex flex-col border-b border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)]">
          <h1 className="text-xl font-bold tracking-tighter">Sua Biblioteca</h1>
          <small className="text-sm text-[var(--text-disabled)]">
            navegação de conteúdo
          </small>
        </div>
        {/* Profile menu simplificado sem dados do JSON */}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Seções principais - placeholder sem dados */}
        <nav className="flex-1 space-y-1">
          <button
            key="nav-biblioteca"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm hover:bg-[var(--bg-elevated)] transition-colors"
            aria-current="page">
            <span className="w-2 h-2 rounded-full" />
            <span>Biblioteca</span>
          </button>
          <button
            key="nav-playlists"
            onClick={() => router.push('/playlists')}
            className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm hover:bg-[var(--bg-elevated)] transition-colors">
            <span className="w-2 h-2 rounded-full" />
            <span>Playlists</span>
          </button>
          <button
            key="nav-artists"
            onClick={() => router.push('/artists')}
            className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm hover:bg-[var(--bg-elevated)] transition-colors">
            <span className="w-2 h-2 rounded-full" />
            <span>Artistas</span>
          </button>
          <button
            key="nav-albums"
            onClick={() => router.push('/albums')}
            className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm hover:bg-[var(--bg-elevated)] transition-colors">
            <span className="w-2 h-2 rounded-full" />
            <span>Álbuns</span>
          </button>
        </nav>

        {/* Mobile behavior */}
        {mode !== 'collapsed' && (
          <div className="p-2 border-t border-[var(--border)]">
            <button
              onClick={() => setMode('collapsed')}
              className="w-full px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Colapsar sidebar">
              ☰
            </button>
          </div>
        )}
      </main>
    </aside>
  )
}