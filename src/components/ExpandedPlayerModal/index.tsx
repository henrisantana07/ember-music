'use client'

import { AnimatePresence, motion } from 'motion/react'
import { usePlayerStore } from '@/lib/store'
import { useSidebarStore } from '@/lib/sidebar-store'
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
 *
 * O `y` de 100% para 0 e a entrada DE BAIXO PARA CIMA ate a posicao de
 * repouso: o mesmo gesto da rota `/reproducao` (`.animate-hero-rise`).
 * Quando a tela cheia liga ou desliga com a hero ABERTA, o que muda e a
 * POSICAO da caixa (`top`/`left`), e isso e a transicao da classe
 * `.expanded-player` no `globals.css`: sem ela o painel saltava de lugar.
 */
export function ExpandedPlayerModal() {
  const isExpandedOpen = usePlayerStore((s) => s.isExpandedOpen)
  const closeExpanded = usePlayerStore((s) => s.closeExpanded)
  const immersive = useSidebarStore((s) => s.immersive)

  return (
    // No desktop a hero entra abaixo do Topbar em vez de cobri-lo: a busca e o
    // avatar continuam à mão e a linha do `border-b` de cima é real, não uma
    // reimpressão. No mobile ela segue full-bleed, com header próprio — única
    // marca de branding em tela pequena e o botão da fila.
    // Em tela cheia os dois deslocamentos somem: sem Topbar não há `top-16`,
    // e sem coluna o `--sidebar-w` volta a 0 — daí as classes caírem por completo.
    <AnimatePresence>
      {isExpandedOpen && (
        <motion.div
          key="expanded-player"
          role="dialog"
          aria-modal="true"
          aria-label="Player expandido"
          className={`expanded-player fixed top-0 ${immersive ? '' : 'md:top-16'} right-0 bottom-0 left-0 ${immersive ? '' : 'md:left-[var(--sidebar-w,0px)]'} z-[60] overflow-hidden`}
          style={{ backgroundColor: 'var(--bg-base)' }}
          initial={{ y: '100%' }}
          animate={{ y: 0, transition: TRANSITION.surfaceEnter }}
          exit={{ y: '100%', transition: TRANSITION.surfaceExit }}
        >
          <NowPlaying onClose={closeExpanded} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
