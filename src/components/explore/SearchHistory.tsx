'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface HistoryItem {
  id: string
  query: string
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
        {history.map((item) => (
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
              <span className="flex-1 text-body-large font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {item.query}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
              className="h-11 w-11 mr-2 inline-flex items-center justify-center rounded-full transition-colors state-layer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label={`Remover busca "${item.query}" do histórico`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
