'use client'

import { useEffect } from 'react'
import { usePlayerStore } from '@/lib/store'

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      const store = usePlayerStore.getState()
      if (!store.currentTrack) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          store.togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          store.prev()
          break
        case 'ArrowRight':
          e.preventDefault()
          store.next()
          break
        case 'ArrowUp':
          e.preventDefault()
          store.setVolume(Math.min(1, store.volume + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          store.setVolume(Math.max(0, store.volume - 0.1))
          break
        case 'KeyM':
          e.preventDefault()
          store.setVolume(store.volume > 0 ? 0 : 1)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
