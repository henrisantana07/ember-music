'use client'

import { useEffect, useRef, useState } from 'react'
import type { TransitionEvent } from 'react'
import { usePlayerStore } from '@/lib/store'
import { useSidebarStore } from '@/lib/sidebar-store'
import NowPlaying from '@/components/NowPlaying'
import { EASE, TRANSITION } from '@/lib/motion'

/**
 * Slides a full-height panel in from the bottom edge of the viewport and back
 * out again when it closes.
 *
 * A transição vive no CSS, não no Motion: nesta versão do `motion/react` o
 * `AnimatePresence` removia o filho no mesmo commit do `isExpandedOpen=false`,
 * e o `onAnimationComplete` disparava antes do slide de saída. Aqui o painel só
 * é desmontado depois do `transitionend` (com um timeout de segurança).
 */
const ENTER_MS = TRANSITION.surfaceEnter.duration * 1000
/** A saída usa a mesma duração da entrada; só o easing é diferente. */
const EXIT_MS = ENTER_MS

function easing(ease: readonly number[] | string): string {
  return typeof ease === 'string' ? ease : `cubic-bezier(${ease.join(',')})`
}

export function ExpandedPlayerModal() {
  const isExpandedOpen = usePlayerStore((s) => s.isExpandedOpen)
  const closeExpanded = usePlayerStore((s) => s.closeExpanded)
  const immersive = useSidebarStore((s) => s.immersive)
  const [render, setRender] = useState(isExpandedOpen)
  const [shown, setShown] = useState(false)
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isExpandedOpen) {
      setRender(true)
      // Um frame entre montar e marcar `shown` garante que o navegador pinte
      // `translateY(100%)` antes de transicionar para 0.
      const frame = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(frame)
    }
    setShown(false)
    if (fallback.current) clearTimeout(fallback.current)
    fallback.current = setTimeout(() => setRender(false), EXIT_MS + 120)
    return () => {
      if (fallback.current) clearTimeout(fallback.current)
    }
  }, [isExpandedOpen])

  function handleTransitionEnd(e: TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
    if (!isExpandedOpen) setRender(false)
  }

  if (!render) return null

  return (
    // No desktop a hero entra abaixo do Topbar em vez de cobri-lo: a busca e o
    // avatar continuam à mão e a linha do `border-b` de cima é real, não uma
    // reimpressão. No mobile ela segue full-bleed, com header próprio — única
    // marca de branding em tela pequena e o botão da fila.
    // Em tela cheia os dois deslocamentos somem: sem Topbar não há `top-16`,
    // e sem coluna o `--sidebar-w` volta a 0 — daí as classes caírem por completo.
    <div
      key="expanded-player"
      role="dialog"
      aria-modal="true"
      aria-label="Player expandido"
      className={`expanded-player fixed top-0 ${immersive ? '' : 'md:top-16'} right-0 bottom-0 left-0 ${immersive ? '' : 'md:left-[var(--sidebar-w,0px)]'} z-[60] overflow-hidden`}
      style={{
        backgroundColor: 'var(--bg-base)',
        pointerEvents: isExpandedOpen ? 'auto' : 'none',
        transform: isExpandedOpen && shown ? 'translateY(0)' : 'translateY(100%)',
        transition: `transform ${isExpandedOpen ? ENTER_MS : EXIT_MS}ms ${isExpandedOpen ? easing(EASE.surface) : easing(EASE.sheet)}`,
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      <NowPlaying onClose={closeExpanded} />
    </div>
  )
}
