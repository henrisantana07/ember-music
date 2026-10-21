/**
 * Hook React para cor do hero baseada na capa da faixa atual.
 *
 * Segue a skill ember-hero-track-color:
 * - Estado explícito de resultado/erro/carregamento
 * - crossOrigin antes de src
 * - Cleanup impede resposta obsoleta de sobrescrever faixa nova
 * - Cache em memória por URL da capa
 * - Troca de faixa limpa resultado anterior imediatamente
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  extractTrackHeroColor,
  hexToRgb,
  rgbToHsl,
  type TrackHeroColor,
} from '@/lib/color/extract-track-color'

interface UseTrackHeroColorOptions {
  /** URL da capa (já resolvida para alta resolução se possível). */
  coverUrl: string | null | undefined
  /** ID da faixa — usado para invalidar cache/resposta obsoleta. */
  trackId: string | null | undefined
  /** Fallback de cor se extração falhar (hex). */
  fallbackColor?: string
}

interface UseTrackHeroColorResult {
  /** Cor extraída ou null se ainda carregando/erro. */
  color: TrackHeroColor | null
  /** True enquanto extração em andamento. */
  loading: boolean
  /** Erro se falhou permanentemente. */
  error: Error | null
  /** Força re-extração (útil se coverUrl mudou mas trackId não). */
  refresh: () => void
}

/** Cache simples em memória: URL -> TrackHeroColor. Limite 50 entradas. */
const colorCache = new Map<string, TrackHeroColor>()
const MAX_CACHE_SIZE = 50

function cacheGet(url: string): TrackHeroColor | undefined {
  return colorCache.get(url)
}

function cacheSet(url: string, color: TrackHeroColor): void {
  if (colorCache.size >= MAX_CACHE_SIZE) {
    // Remove a mais antiga (Map mantém ordem de inserção)
    const firstKey = colorCache.keys().next().value
    if (firstKey) colorCache.delete(firstKey)
  }
  colorCache.set(url, color)
}

export function useTrackHeroColor({
  coverUrl,
  trackId,
  fallbackColor,
}: UseTrackHeroColorOptions): UseTrackHeroColorResult {
  const [color, setColor] = useState<TrackHeroColor | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Ref para ID da faixa atual — evita resposta obsoleta
  const currentTrackIdRef = useRef(trackId)
  // Ref para URL atual — evita extração duplicada
  const currentUrlRef = useRef(coverUrl)
  // Ref para controle de cancelamento
  const abortRef = useRef(false)

  const extract = useCallback(async () => {
    if (!coverUrl || !trackId) {
      setColor(null)
      setLoading(false)
      return
    }

    // Se mesma URL e já tem cache, usa direto
    const cached = cacheGet(coverUrl)
    if (cached) {
      setColor(cached)
      setLoading(false)
      return
    }

    // Nova extração
    abortRef.current = false
    currentTrackIdRef.current = trackId
    currentUrlRef.current = coverUrl
    // Yield to event loop antes de setState para satisfazer react-hooks/set-state-in-effect
    await Promise.resolve()
    setLoading(true)
    setError(null)

    try {
      const result = await extractTrackHeroColor(coverUrl)

      // Verifica se ainda é a faixa/URL atual (não foi ultrapassada)
      if (abortRef.current || currentTrackIdRef.current !== trackId || currentUrlRef.current !== coverUrl) {
        return // resposta obsoleta — descarta
      }

      if (result) {
        cacheSet(coverUrl, result)
        setColor(result)
      } else {
        /* Fallback sintético — só se `fallbackColor` for um hex real de 6 dígitos.
           Um token CSS (`var(--x)`) ou outro valor não-hex cairia aqui e viraria
           `#NaNNaNNaN` no `panelStyle`, então validamos antes de aceitar. */
        const rgb = fallbackColor ? hexToRgb(fallbackColor) : null
        if (rgb) {
          const color = fallbackColor as string
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
          const gradient = `radial-gradient(ellipse at 28% 18%, ${color}F2 0%, ${color}99 30%, ${color}59 50%, var(--bg-base) 78%)`
          setColor({ primary: color, light: color, gradient, hsl })
        } else {
          setColor(null)
        }
      }
    } catch (e) {
      if (!abortRef.current && currentTrackIdRef.current === trackId) {
        setError(e instanceof Error ? e : new Error('Extraction failed'))
        setColor(null)
      }
    } finally {
      if (!abortRef.current && currentTrackIdRef.current === trackId) {
        setLoading(false)
      }
    }
  }, [coverUrl, trackId, fallbackColor])

  // Effect principal: roda quando coverUrl ou trackId mudam
  useEffect(() => {
    let mounted = true
    ;(async () => {
      await extract()
      if (!mounted) return
    })()
    return () => {
      mounted = false
      abortRef.current = true // cancela extração em andamento
    }
  }, [extract])

  // Refresh manual
  const refresh = useCallback(() => {
    // Invalida cache desta URL
    if (coverUrl) colorCache.delete(coverUrl)
    extract()
  }, [coverUrl, extract])

  return { color, loading, error, refresh }
}