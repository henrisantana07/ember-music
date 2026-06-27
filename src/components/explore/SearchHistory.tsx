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
        <button onClick={clearAll} className="text-xs font-semibold" style={{ color: 'var(--accent-solid)' }}>
          Limpar tudo
        </button>
      </div>
      <div className="space-y-1" style={{ maxHeight: 320, overflowY: 'auto' }}>
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSearch(item.query)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/5 group"
          >
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {item.query}
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
              className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
              style={{ color: 'var(--text-disabled)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
