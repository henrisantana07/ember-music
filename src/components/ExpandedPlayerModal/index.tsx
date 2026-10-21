'use client'

import { AnimatePresence, motion } from 'motion/react'
import { usePlayerStore } from '@/lib/store'
import NowPlaying from '@/components/NowPlaying'
import { TRANSITION } from '@/lib/motion'

/**
 * Slides a full-height panel in from the bottom edge of the viewport.
 *
 * `AnimatePresence` is the whole reason this component is now three lines of
 * logic instead of six. It used to keep the element in the DOM itself — a
 * `phase: 'idle' | 'open' | 'closing'` flag, a `setTimeout(CLOSE_MS)` and a
 * `closingRef` to ignore repeat presses — purely so the slide-down had
 * somewhere to happen before unmounting. The presence condition now carries
 * the tree through its own exit, so `closeExpanded` can flip the store
 * immediately and the animation follows.
 */
export function ExpandedPlayerModal() {
  const isExpandedOpen = usePlayerStore((s) => s.isExpandedOpen)
  const closeExpanded = usePlayerStore((s) => s.closeExpanded)

  return (
    // No desktop a hero entra abaixo do Topbar em vez de cobri-lo: a busca e o
    // avatar continuam à mão e a linha do `border-b` de cima é real, não uma
    // reimpressão. No mobile ela segue full-bleed, com header próprio — única
    // marca de branding em tela pequena e o botão da fila.
    <AnimatePresence>
      {isExpandedOpen && (
        <motion.div
          key="expanded-player"
          role="dialog"
          aria-modal="true"
          aria-label="Player expandido"
          className="fixed top-0 md:top-16 right-0 bottom-0 left-0 md:left-[var(--sidebar-w,0px)] z-[60] overflow-hidden"
          style={{ backgroundColor: 'var(--bg-base)' }}
          initial={{ y: '100%' }}
          animate={{ y: 0, transition: TRANSITION.surface }}
          exit={{ y: '100%', transition: TRANSITION.surface }}
        >
          <NowPlaying onClose={closeExpanded} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
