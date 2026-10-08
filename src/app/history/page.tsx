'use client'

import { useCallback, useEffect, useState } from 'react'
import { TrackCard } from '@/components/TrackCard'
import type { Track } from '@/types/music'
import { getPlaybackHistory } from '@/lib/playback-history'
import { useUser } from '@/hooks/use-user'
import { ErrorState, EmptyState } from '@/components/ui/states'

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
  const { user, loading: userLoading } = useUser()
  const [items, setItems] = useState<{ played_at: string; track_data: Track }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setError(false)
    setLoading(true)
    setAttempt((a) => a + 1)
  }, [])

  useEffect(() => {
    if (userLoading) return
    if (!user) return
    let cancelled = false
    async function loadHistory() {
      try {
        const history = await getPlaybackHistory(user)
        if (cancelled) return
        setItems(history.map(h => ({ played_at: h.played_at, track_data: h.track_data })))
        setError(false)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadHistory()
    return () => { cancelled = true }
  }, [user, userLoading, attempt])

  const stillLoading = userLoading || (!!user && loading)

  if (stillLoading) {
    return (
      <div className="flex items-center justify-center py-32" role="status" aria-label="Carregando histórico">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto w-full px-4 md:px-8" style={{ maxWidth: 1100 }}>
        <h1 className="text-2xl font-bold mb-6">Histórico de Reprodução</h1>
        <ErrorState
          title="Não foi possível carregar o histórico"
          description="Verifique sua conexão e tente novamente."
          action={{ label: 'Tentar novamente', onClick: retry }}
        />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full px-4 md:px-8" style={{ maxWidth: 1100 }}>
        <h1 className="text-2xl font-bold mb-6">Histórico de Reprodução</h1>
        <EmptyState
          title="Entre para ver seu histórico"
          description="Faça login para acompanhar as músicas que você ouviu."
          action={{ label: 'Ir para o login', onClick: () => { window.location.href = '/login' } }}
        />
      </div>
    )
  }

  const grouped = groupByDate(items)
  const flatTracks = items.map((i) => i.track_data)

  return (
    <div className="mx-auto w-full px-4 md:px-8" style={{ maxWidth: 1100 }}>
      <h1 className="text-2xl font-bold mb-6">Histórico de Reprodução</h1>

      {items.length === 0 ? (
        <EmptyState
          title="Nenhuma música tocada ainda"
          description="Comece a ouvir e seu histórico aparecerá aqui."
          action={{ label: 'Explorar músicas', onClick: () => { window.location.href = '/buscar' } }}
        />
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
                  tracks={flatTracks}
                  user={user}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
