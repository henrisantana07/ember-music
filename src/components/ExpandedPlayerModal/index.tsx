'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { usePlayerStore } from '@/lib/store'
import { useSidebarStore } from '@/lib/sidebar-store'
import NowPlaying from '@/components/NowPlaying'
import { TRANSITION } from '@/lib/motion'

/**
 * Slides a full-height panel in from the bottom edge of the viewport and back
 * out again when it closes.
 *
 * A montagem é controlada aqui, não pelo `AnimatePresence`: nesta versão do
 * Motion o filho era removido no mesmo commit em que `isExpandedOpen` virava
 * `false`, então o `exit` nunca chegava a animar. Mantendo o painel montado até
 * `onAnimationComplete`, o slide de saída sempre termina antes do unmount.
 */
export function ExpandedPlayerModal() {
  const isExpandedOpen = usePlayerStore((s) => s.isExpandedOpen)
  const closeExpanded = usePlayerStore((s) => s.closeExpanded)
  const immersive = useSidebarStore((s) => s.immersive)
  const [render, setRender] = useState(isExpandedOpen)

  useEffect(() => {
    if (isExpandedOpen) setRender(true)
  }, [isExpandedOpen])

  if (!render) return null

  return (
    // No desktop a hero entra abaixo do Topbar em vez de cobri-lo: a busca e o
    // avatar continuam à mão e a linha do `border-b` de cima é real, não uma
    // reimpressão. No mobile ela segue full-bleed, com header próprio — única
    // marca de branding em tela pequena e o botão da fila.
    // Em tela cheia os dois deslocamentos somem: sem Topbar não há `top-16`,
    // e sem coluna o `--sidebar-w` volta a 0 — daí as classes caírem por completo.
    <motion.div
      key="expanded-player"
      role="dialog"
      aria-modal="true"
      aria-label="Player expandido"
      className={`expanded-player fixed top-0 ${immersive ? '' : 'md:top-16'} right-0 bottom-0 left-0 ${immersive ? '' : 'md:left-[var(--sidebar-w,0px)]'} z-[60] overflow-hidden`}
      style={{ backgroundColor: 'var(--bg-base)', pointerEvents: isExpandedOpen ? 'auto' : 'none' }}
      initial={{ y: '100%' }}
      animate={{ y: isExpandedOpen ? 0 : '100%' }}
      transition={isExpandedOpen ? TRANSITION.surfaceEnter : TRANSITION.surfaceExit}
      onAnimationComplete={() => {
        if (!isExpandedOpen) setRender(false)
      }}
    >
      <NowPlaying onClose={closeExpanded} />
    </motion.div>
  )
}
