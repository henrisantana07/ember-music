'use client'

import { useCallback, useRef, useState } from 'react'
import { usePlayerStore } from '@/lib/store'
import NowPlaying from '@/components/NowPlaying'

const CLOSE_MS = 320

type Phase = 'idle' | 'open' | 'closing'

export function ExpandedPlayerModal() {
  const isExpandedOpen = usePlayerStore((s) => s.isExpandedOpen)
  const closeExpanded = usePlayerStore((s) => s.closeExpanded)
  const [phase, setPhase] = useState<Phase>('idle')
  const closingRef = useRef(false)

  if (phase === 'idle' && isExpandedOpen) {
    setPhase('open')
  }

  const handleClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setPhase('closing')
    window.setTimeout(() => {
      closingRef.current = false
      setPhase('idle')
      closeExpanded()
    }, CLOSE_MS)
  }, [closeExpanded])

  if (phase === 'idle' || !isExpandedOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Player expandido"
      className={`fixed top-0 right-0 bottom-0 left-0 md:left-[var(--sidebar-w,0px)] z-[60] overflow-hidden ${
        phase === 'closing' ? 'modal-slide-down' : 'modal-slide-up'
      }`}
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <NowPlaying onClose={handleClose} />
    </div>
  )
}
