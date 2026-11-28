'use client'

import { KawarpBackground } from '@/components/Player/KawarpBackground'

interface SectionKawarpProps {
  /** Capa que alimenta o warp. Sem capa, nada é renderizado. */
  coverUrl?: string | null
  /** Classes de posicionamento aplicadas pela seção que hospeda o efeito. */
  className?: string
  /** Escurecimento sobre o canvas para manter o texto legível. */
  dimLevel?: number
  /** Saturação da cor dominante extraída da capa. */
  saturation?: number
  /** Força do tint nas áreas escuras da capa. */
  tintIntensity?: number
  /** Escala do warp — acima de 1 preenche mais da área com a capa. */
  scale?: number
  /** Scrim funcional de contraste; cada seção decide quanto da cor guarda. */
  scrim?: string
  /** Tint explícito (cor dominante extraída) quando a capa é escura. */
  palette?: { primary: string; secondary: string; tertiary?: string; base?: string } | null
  /** Realce de brilho/saturação para capas escuras — usar só na hero. */
  boost?: boolean
  /** Camada escura animada, usada na hero para preservar contraste. */
  dimClassName?: string
  /** Perda de nitidez progressiva na faixa, sem tocar no conteúdo à frente. */
  blurGradient?: boolean
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
  saturation = 1.2,
  tintIntensity = 0.12,
  scale = 1,
  scrim = 'linear-gradient(to bottom, transparent 30%, var(--bg-base) 100%)',
  palette,
  boost = false,
  dimClassName = '',
  blurGradient = false,
}: SectionKawarpProps) {
  if (!coverUrl) return null

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute isolate overflow-hidden select-none ${className}`}
      style={{ zIndex: -1, filter: boost ? 'brightness(1.55) saturate(1.5)' : undefined }}
    >
      <KawarpBackground
        coverUrl={coverUrl}
        dimLevel={dimLevel}
        warpIntensity={0.42}
        blurPasses={14}
        animationSpeed={0.45}
        saturation={saturation}
        tintIntensity={tintIntensity}
        scale={scale}
        palette={palette}
      />
      {/* O blur é aplicado só ao fundo, com máscara vertical: o topo perto do
          conteúdo continua nítido e a base dissolve sem perder legibilidade. */}
      {blurGradient && (
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: 'blur(10px)',
            maskImage: 'linear-gradient(to bottom, transparent 8%, black 88%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 8%, black 88%)',
          }}
        />
      )}
      {/* Scrim funcional: não é decoração, é o que garante contraste do texto. */}
      <div className="absolute inset-0" style={{ background: scrim }} />
      {dimClassName && <div className={`absolute inset-0 ${dimClassName}`} />}
    </div>
  )
}
