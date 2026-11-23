'use client'

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'

// Carregamento dinâmico do Kawarp apenas no cliente (evita erros no SSR do Next.js)
const Kawarp = dynamic(
  () => import('@kawarp/react').then((mod) => mod.Kawarp),
  { ssr: false }
)

export interface KawarpBackgroundProps {
  /** URL da capa do álbum/vídeo */
  coverUrl?: string | null
  /** Classes CSS adicionais */
  className?: string
  /** Nível de escurecimento sobre o canvas para garantir contraste (0 a 1) */
  dimLevel?: number
}

/**
 * Renderiza o fundo com o efeito característico do Kawarp (Kawase blur + domain warping estilo Apple Music),
 * porém de forma 100% estática (animationSpeed = 0), sem consumo contínuo de GPU/bateria.
 */
export function KawarpBackground({
  coverUrl,
  className = '',
  dimLevel = 0.35,
}: KawarpBackgroundProps) {
  const [mounted, setMounted] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reseta o estado de erro quando a capa muda
  useEffect(() => {
    setHasError(false)
  }, [coverUrl])

  // Roteia a URL pelo proxy de imagem interno para contornar qualquer bloqueio de CORS de WebGL
  const proxiedSrc = useMemo(() => {
    if (!coverUrl) return ''
    if (
      coverUrl.startsWith('/') ||
      coverUrl.startsWith('data:') ||
      coverUrl.startsWith('blob:')
    ) {
      return coverUrl
    }
    return `/api/image-proxy?src=${encodeURIComponent(coverUrl)}`
  }, [coverUrl])

  if (!mounted || !proxiedSrc || hasError) {
    return null
  }

  return (
    <div
      aria-hidden
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
      style={{ zIndex: 0 }}
    >
      <Kawarp
        src={proxiedSrc}
        animationSpeed={0}
        warpIntensity={1.0}
        blurPasses={8}
        saturation={1.4}
        scale={1.0}
        transitionDuration={800}
        onError={() => setHasError(true)}
        className="w-full h-full"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {/* Camada de escurecimento para contraste do texto */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: `rgba(0, 0, 0, ${dimLevel})` }}
      />
    </div>
  )
}

export default KawarpBackground
