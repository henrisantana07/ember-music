'use client'

import { KawarpBackground } from '@/components/Player/KawarpBackground'

interface SectionKawarpProps {
  /** Capa que alimenta o warp. Sem capa, nada é renderizado. */
  coverUrl?: string | null
  /** Classes de posicionamento aplicadas pela seção que hospeda o efeito. */
  className?: string
  /** Escurecimento sobre o canvas para manter o texto legível. */
  dimLevel?: number
}

/**
 * Fundo de seção com o efeito Kawarp do player, em vez de um gradiente CSS.
 * O canvas é um único elemento por seção — nunca um por card — e recebe a
 * capa real via proxy interno, com o mesmo warp/blur do player expandido.
 */
export function SectionKawarp({
  coverUrl,
  className = '',
  dimLevel = 0.32,
}: SectionKawarpProps) {
  if (!coverUrl) return null

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute isolate overflow-hidden select-none ${className}`}
      style={{ zIndex: -1 }}
    >
      <KawarpBackground
        coverUrl={coverUrl}
        dimLevel={dimLevel}
        warpIntensity={0.42}
        blurPasses={14}
        animationSpeed={0.45}
        saturation={1.2}
        tintIntensity={0.12}
      />
      {/* Scrim funcional: não é decoração, é o que garante contraste do texto. */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 30%, var(--bg-base) 100%)' }}
      />
    </div>
  )
}
