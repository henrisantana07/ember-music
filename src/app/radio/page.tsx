'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePlayerStore } from '@/lib/store'
import type { JamendoTrack } from '@/types/jamendo'

const GENRES = [
  { value: 'electronic', label: 'Eletrônica' },
  { value: 'rock', label: 'Rock' },
  { value: 'pop', label: 'Pop' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'classical', label: 'Clássica' },
  { value: 'hiphop', label: 'Hip Hop' },
  { value: 'reggae', label: 'Reggae' },
  { value: 'folk', label: 'Folk' },
  { value: 'blues', label: 'Blues' },
  { value: 'metal', label: 'Metal' },
  { value: 'ambient', label: 'Ambient' },
  { value: 'latin', label: 'Latina' },
]

export default function RadioPage() {
  const [selectedGenre, setSelectedGenre] = useState('')
  const [queue, setQueue] = useState<JamendoTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingMore, setFetchingMore] = useState(false)
  const pageRef = useRef(1)
  const { play, currentTrack, isPlaying, next: playNext } = usePlayerStore()

  const fetchTracks = useCallback(async (page: number) => {
    if (!selectedGenre) return []
    const res = await fetch(
      `/api/jamendo?endpoint=tracks&tags=${selectedGenre}&order=popularity_desc&limit=20&offset=${(page - 1) * 20}`
    )
    const data = await res.json()
    return (data.results ?? []) as JamendoTrack[]
  }, [selectedGenre])

  const startRadio = useCallback(async () => {
    if (!selectedGenre) return
    setLoading(true)
    pageRef.current = 1
    const tracks = await fetchTracks(1)
    setQueue(tracks)
    setLoading(false)
    if (tracks.length > 0) {
      play(tracks, Math.floor(Math.random() * tracks.length))
    }
  }, [selectedGenre, fetchTracks, play])

  const loadMore = useCallback(async () => {
    if (!selectedGenre || fetchingMore) return
    setFetchingMore(true)
    pageRef.current += 1
    const newTracks = await fetchTracks(pageRef.current)
    setQueue((prev) => {
      const existing = new Set(prev.map((t) => t.id))
      const unique = newTracks.filter((t) => !existing.has(t.id))
      return [...prev, ...unique]
    })
    setFetchingMore(false)
  }, [selectedGenre, fetchingMore, fetchTracks])

  useEffect(() => {
    if (!currentTrack || !isPlaying) return
    const tracks = usePlayerStore.getState().queue
    const idx = tracks.findIndex((t) => t.id === currentTrack.id)
    if (idx >= tracks.length - 2) loadMore()
  }, [currentTrack, isPlaying, loadMore])

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Rádio por Gênero</h1>

      <div className="flex flex-wrap gap-2 mb-8">
        {GENRES.map((g) => (
          <button
            key={g.value}
            onClick={() => setSelectedGenre(g.value)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              backgroundColor: selectedGenre === g.value ? 'var(--accent-from)' : 'var(--bg-elevated)',
              color: selectedGenre === g.value ? '#fff' : 'var(--text-primary)',
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {selectedGenre && (
        <button
          onClick={startRadio}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-bold transition-transform hover:scale-[1.02] disabled:opacity-50 mb-8"
          style={{ background: 'linear-gradient(to right, var(--accent-from), var(--accent-to))', color: '#fff' }}
        >
          {loading ? 'Carregando...' : currentTrack && isPlaying ? 'Reiniciar Rádio' : 'Iniciar Rádio'}
        </button>
      )}

      {currentTrack && isPlaying && selectedGenre && (
        <div className="p-6 rounded-2xl mb-8" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Tocando agora</p>
          <div className="flex items-center gap-4">
            <img src={currentTrack.image || '/placeholder.svg'} alt={currentTrack.name}
              className="w-16 h-16 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{currentTrack.name}</p>
              <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{currentTrack.artist_name}</p>
            </div>
            <button onClick={playNext}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-colors hover:bg-white/10"
              style={{ border: '1px solid var(--text-disabled)', color: 'var(--text-secondary)' }}>
              Próxima
            </button>
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Fila da rádio ({queue.length})</h2>
          <div className="space-y-1">
            {queue.slice(0, 30).map((track) => (
              <div key={track.id} className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
                <img src={track.image || '/placeholder.svg'} alt={track.name}
                  className="w-10 h-10 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{track.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{track.artist_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedGenre && (
        <div className="py-20 text-center" style={{ color: 'var(--text-secondary)' }}>
          Selecione um gênero para começar a ouvir
        </div>
      )}
    </div>
  )
}
