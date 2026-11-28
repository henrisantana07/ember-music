'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface HistoryItem {
  id: string
  query: string
}

/** O histórico guarda o termo enviado à API, que muitas vezes é uma URL ou um
 *  ID cru. Mostramos um rótulo legível; a busca continua usando o valor real. */
export function readableQuery(raw: string): string {
  const value = raw.trim()
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    const term = url.searchParams.get('q') ?? url.searchParams.get('search_query')
    if (term) return term
    const video = url.searchParams.get('v')
    if (video && /^[A-Za-z0-9_-]{8,}$/.test(video)) return `Vídeo ${video}`
    const list = url.searchParams.get('list')
    if (list) return `Playlist ${list.slice(0, 12)}…`
    const pathVideo = url.pathname.split('/').filter(Boolean).pop()
    if (pathVideo && /^[A-Za-z0-9_-]{8,}$/.test(pathVideo)) return `Vídeo ${pathVideo.slice(0, 12)}`
  } catch { /* não é URL */ }

  const videoId = value.match(/(?:[?&]v=|youtu\.be\/|^)([A-Za-z0-9_-]{11})/)?.[1]
  if (videoId) return `Vídeo ${videoId}`
  const listId = value.match(/[?&]list=([A-Za-z0-9_-]{10,})/)?.[1]
  if (listId) return `Playlist ${listId.slice(0, 12)}…`
  return value
}

export function SearchHistory({ user, onSearch }: { user: User | null; onSearch: (q: string) => void }) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    supabase
      .from('search_history')
      .select('id, query')
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (data) setHistory(data as HistoryItem[])
      })
  }, [user])

  async function removeItem(id: string) {
    await supabase.from('search_history').delete().eq('id', id)
    setHistory(prev => prev.filter(h => h.id !== id))
  }

  async function clearAll() {
    if (!user) return
    await supabase.from('search_history').delete().eq('user_id', user.id)
    setHistory([])
  }

  if (history.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Buscas recentes</h2>
        <button onClick={clearAll} className="text-label-medium font-semibold px-3 min-h-[44px] rounded-full state-layer" style={{ color: 'var(--accent-solid)' }}>
          Limpar tudo
        </button>
      </div>
      <div className="space-y-1" style={{ maxHeight: 384, overflowY: 'auto' }}>
        {history.map((item) => {
          const label = readableQuery(item.query)
          return (
          <div
            key={item.id}
            className="flex items-center gap-1 rounded-lg transition-colors hover:bg-state-hover group"
          >
            <button
              type="button"
              onClick={() => onSearch(item.query)}
              className="flex items-center gap-3 flex-1 min-w-0 px-3 min-h-[48px] text-left rounded-lg state-layer"
            >
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1 text-body-large font-medium truncate" style={{ color: 'var(--text-primary)' }} title={item.query}>
                {label}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
              className="h-11 w-11 mr-2 inline-flex items-center justify-center rounded-full transition-colors state-layer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label={`Remover busca "${label}" do histórico`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          )
        })}
      </div>
    </section>
  )
}
