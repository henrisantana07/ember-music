'use client'

import { useEffect, useState } from 'react'
import { extractDominantColor } from '@/lib/color/extractDominantColor'

const TESTS = [
  ['dzcdn', 'https://cdn-images.dzcdn.net/images/cover/5718f7c81c27e0b2417e2a4c45224f8a/250x250-000000-80-0-0.jpg'],
  ['ytimg', 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg'],
  ['supabase', 'https://invalid.supabase.co/storage/v1/object/public/x/y.png'],
] as const

export default function BloomDebugPage() {
  const [results, setResults] = useState<Record<string, string>>({})

  useEffect(() => {
    TESTS.forEach(([key, url]) => {
      extractDominantColor(url).then((c) => setResults((prev) => ({ ...prev, [key]: c ?? 'null' })))
    })

    localStorage.setItem(
      'player-storage',
      JSON.stringify({
        state: {
          currentTrack: {
            id: 'debug-track',
            name: 'Blooom Test Track',
            artist_name: 'Artista Teste',
            artist_id: '1',
            image: 'https://cdn-images.dzcdn.net/images/cover/5718f7c81c27e0b2417e2a4c45224f8a/500x500-000000-80-0-0.jpg',
            duration: 200,
            source: 'deezer',
            album_name: 'Album Teste',
          },
          queue: [],
          originalQueue: [],
          shuffleOrder: [],
          currentShuffleIndex: 0,
          currentPlaylistId: null,
          currentPlaylistName: null,
          repeat: 'none',
          shuffle: false,
          volume: 1,
          crossfadeDuration: 0,
          sleepTimerMinutes: null,
          miniPlayer: false,
        },
        version: 0,
      }),
    )
  }, [])

  return (
    <div style={{ padding: 20, fontSize: 24 }}>
      {TESTS.map(([key]) => (
        <div key={key} id={key}>{key}: {results[key] ?? 'pending'}</div>
      ))}
    </div>
  )
}
