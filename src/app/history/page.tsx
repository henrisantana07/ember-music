'use client'

import { useEffect, useState } from 'react'
import { TrackCard } from '@/components/TrackCard'
import type { Track } from '@/types/music'

function groupByDate(items: { played_at: string; track_data: Track }[]) {
  const groups: Record<string, typeof items> = {}
  for (const item of items) {
    const date = new Date(item.played_at).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  }
  return groups
}

export default function HistoryPage() {
  const [items, setItems] = useState<{ played_at: string; track_data: Track }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setItems([])
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const grouped = groupByDate(items)

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Histórico de Reprodução</h1>

      {items.length === 0 ? (
        <div className="py-20 text-center" style={{ color: 'var(--text-secondary)' }}>
          Nenhuma música tocada ainda. Comece a ouvir!
        </div>
      ) : (
        Object.entries(grouped).map(([date, group]) => (
          <section key={date} className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              {date}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((item) => (
                <TrackCard
                  key={`${item.track_data.id}-${item.played_at}`}
                  track={item.track_data}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
