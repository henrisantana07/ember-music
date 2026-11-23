'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import type { KawarpRef } from '@kawarp/react'
import { KAWARP_DEBUG, logKawarp } from '@/lib/debug/kawarp'

// Carregamento dinâmico do Kawarp apenas no cliente (evita erros no SSR do Next.js).
// O wrapper repassa a instância por prop, porque o `next/dynamic` reserva a
// `ref` para si — `KawarpCanvas.tsx` explica isso em detalhe.
const KawarpCanvas = dynamic(
  () => import('./KawarpCanvas').then((mod) => mod.KawarpCanvas),
  { ssr: false }
)

/**
 * Configuração do Kawarp usada na hero.
 *
 * Equivale ao painel de ajustes da biblioteca:
 * Warp 1.00 · Blur 8 · Speed 1.0× · Transition 1.0s · Saturation 1.50 ·
 * Tint 15% · Dither 8.0 · Scale 1.00.
 *
 * `dithering` é a única que muda de escala no painel: 0.008 na API aparece
 * como 8.0 quando a UI trabalha em milésimos (0–100).
 */
export const KAWARP_DEFAULTS = {
  warpIntensity: 1.0,
  blurPasses: 8,
  animationSpeed: 1.0,
  transitionDuration: 1000,
  saturation: 1.5,
  tintIntensity: 0.15,
  dithering: 0.008,
  scale: 1.0,
} as const

export interface KawarpBackgroundProps {
  /** URL da capa do álbum/vídeo (fonte de fallback quando não há paleta) */
  coverUrl?: string | null
  /** Classes CSS adicionais */
  className?: string
  /** Nível de escurecimento sobre o canvas para garantir contraste (0 a 1) */
  dimLevel?: number
  /** Intensidade do warp (0 a 1) */
  warpIntensity?: number
  /** Passes de blur Kawase (0 a 40) */
  blurPasses?: number
  /** Velocidade da animação (multiplicador) */
  animationSpeed?: number
  /** Duração da transição entre capas em ms */
  transitionDuration?: number
  /** Saturação das cores */
  saturation?: number
  /** Intensidade do tint para áreas escuras (0 a 1) */
  tintIntensity?: number
  /** Dithering para evitar banding de cores */
  dithering?: number
  /** Escala do efeito */
  scale?: number
  /** Ângulo em graus do gradiente gerado a partir da paleta */
  gradientAngle?: number
  /** Paleta com as cores extraídas (primary, secondary, tertiary) */
  palette?: {
    primary: string
    secondary: string
    tertiary?: string
    base?: string
  } | null
}

type GradientSource = {
  kind: 'gradient'
  colors: string[]
  angle: number
}

type ImageSource = {
  kind: 'image'
  src: string
}

type KawarpSource = GradientSource | ImageSource

/* O canvas do Kawarp só existe no cliente. `useSyncExternalStore` detecta isso
   sem `setState` dentro de effect (e sem render em cascata no mount): no
   servidor o snapshot é `false`, no cliente vira `true` na hidratação. */
const subscribeToClient = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

function hexToRgb01(hex: string): [number, number, number] | undefined {
  const match = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex)
  if (!match) return undefined
  return [
    parseInt(match[1], 16) / 255,
    parseInt(match[2], 16) / 255,
    parseInt(match[3], 16) / 255,
  ]
}

/**
 * Renderiza o fundo com o efeito característico do Kawarp (Kawase blur +
 * domain warping estilo Apple Music).
 *
 * A fonte preferida é a paleta extraída da capa: `loadGradient()` recebe
 * `primary`/`secondary`/`tertiary` e o Kawarp anima exatamente essas cores —
 * é o que faz o fundo “ser” a capa, e não uma cópia borrada dela. A capa em
 * si continua aparecendo na hero como `<img>`; o canvas é só o gradiente.
 *
 * Sem paleta (extração ainda em andamento ou falhou), a imagem passa pelo
 * proxy interno e vira a fonte do Kawarp. O `.now-cover-panel` do
 * `globals.css` fica por baixo como fallback estático enquanto o WebGL
 * inicializa.
 */
export function KawarpBackground({
  coverUrl,
  className = '',
  dimLevel = 0.2,
  palette,
  gradientAngle = 135,
  warpIntensity = KAWARP_DEFAULTS.warpIntensity,
  blurPasses = KAWARP_DEFAULTS.blurPasses,
  animationSpeed = KAWARP_DEFAULTS.animationSpeed,
  transitionDuration = KAWARP_DEFAULTS.transitionDuration,
  saturation = KAWARP_DEFAULTS.saturation,
  tintIntensity = KAWARP_DEFAULTS.tintIntensity,
  dithering = KAWARP_DEFAULTS.dithering,
  scale = KAWARP_DEFAULTS.scale,
}: KawarpBackgroundProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const [kawarpReady, setKawarpReady] = useState(false)
  const mounted = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot
  )

  const kawarpRef = useRef<KawarpRef | null>(null)
  /* Última fonte pedida. Serve para reaplicar o gradiente caso um carregamento
     de imagem que já estava em voo termine depois de a paleta chegar. */
  const latestSource = useRef<KawarpSource | null>(null)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const handleInstance = useCallback((instance: KawarpRef | null) => {
    kawarpRef.current = instance
    setKawarpReady(instance !== null)

    // Atalho de diagnóstico: no console do navegador,
    // `__kawarp.instance.getOptions()` mostra a config ativa.
    if (KAWARP_DEBUG && typeof window !== 'undefined') {
      ;(window as typeof window & { __kawarp?: KawarpRef | null }).__kawarp = instance
    }
    logKawarp(instance ? 'canvas montado' : 'canvas desmontado')
  }, [])

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

  // Cores extraídas viram a fonte do Kawarp. `loadGradient` divide o espaço
  // pelo número de cores − 1, então com uma cor só não existe gradiente:
  // nesse caso a capa (fonte de imagem) assume.
  const gradientColors = useMemo(() => {
    if (!palette) return null
    const colors = [palette.primary, palette.secondary, palette.tertiary].filter(
      (color): color is string => typeof color === 'string' && color.trim().length > 0
    )
    return colors.length >= 2 ? colors : null
  }, [palette])

  // Deriva o tom do tint a partir da cor primária extraída da capa
  const derivedTintColor = palette?.primary ? hexToRgb01(palette.primary) : undefined

  const sourceKey = gradientColors
    ? `gradient:${gradientColors.join('|')}`
    : proxiedSrc
      ? `image:${proxiedSrc}`
      : ''

  // A falha é amarrada à fonte que falhou: quando a paleta chega (ou a faixa
  // troca), a chave muda e o erro antigo deixa de esconder o canvas — sem
  // precisar zerar estado dentro de um effect.
  const hasError = failedSource !== null && failedSource === sourceKey

  // Aplica a fonte no Kawarp. Roda sempre que a paleta muda (troca de faixa)
  // e o canvas já está montado; o próprio Kawarp faz o crossfade com
  // `transitionDuration`.
  useEffect(() => {
    if (!kawarpReady || !sourceKey) return
    const currentHandle = kawarpRef.current
    if (!currentHandle) return
    // Cópia explicitamente não-nula: a narrowed const se perde dentro das
    // function declarations hoisted usadas abaixo.
    const handle: KawarpRef = currentHandle

    let cancelled = false
    let frame: number | null = null
    let attempts = 0
    const MAX_ATTEMPTS = 60 // ~1s a 60fps antes de desistir do WebGL

    function schedule(fn: () => void) {
      if (typeof requestAnimationFrame === 'function') {
        frame = requestAnimationFrame(fn)
      } else {
        frame = setTimeout(fn, 16) as unknown as number
      }
    }

    function apply() {
      if (cancelled) return

      /* `useImperativeHandle` do @kawarp/react entrega o handle no layout
         effect, mas o núcleo WebGL só é criado no `useEffect` dele. Se a gente
         chamar `loadGradient()` nessa janela, o método faz optional-chain em
         `kawarpRef.current` e não faz nada — era exatamente o caso em que o
         canvas montava mas o gradiente nunca aparecia. Espera o núcleo. */
      if (!handle.instance) {
        if (attempts++ >= MAX_ATTEMPTS) {
          logKawarp('núcleo WebGL não inicializou')
          if (aliveRef.current) setFailedSource(sourceKey)
          return
        }
        schedule(apply)
        return
      }

      if (gradientColors) {
        const source: GradientSource = {
          kind: 'gradient',
          colors: gradientColors,
          angle: gradientAngle,
        }
        latestSource.current = source
        logKawarp('gradiente aplicado', { colors: source.colors, angle: source.angle })
        try {
          handle.loadGradient(source.colors, source.angle)
          // O gradiente é só a textura; quem anima é o loop de domain warping
          // do Kawarp. `start()` é idempotente e garante o loop mesmo que a
          // instância tenha sido criada sem `src`/`autoPlay`.
          handle.start()
          logKawarp('loop de animação do Kawarp ativo')
        } catch {
          // Contexto WebGL perdido/indisponível: esconde o canvas e deixa o
          // gradiente CSS do `.now-cover-panel` (mesmas cores) como fundo.
          logKawarp('falha ao aplicar o gradiente', { colors: source.colors })
          if (aliveRef.current) setFailedSource(sourceKey)
        }
        return
      }

      if (!proxiedSrc) {
        latestSource.current = null
        return
      }

      const source: ImageSource = { kind: 'image', src: proxiedSrc }
      latestSource.current = source
      logKawarp('capa enviada ao Kawarp (sem paleta)', { src: source.src })

      handle.loadImage(source.src).then(
        () => {
          if (!aliveRef.current) return
          // A paleta pode ter chegado enquanto a capa carregava. Nesse caso o
          // gradiente vence: reaplica a fonte mais recente.
          const latest = latestSource.current
          if (latest?.kind === 'gradient') {
            logKawarp('gradiente reaplicado depois da capa', { colors: latest.colors })
            try {
              handle.loadGradient(latest.colors, latest.angle)
            } catch {
              if (aliveRef.current) setFailedSource(`gradient:${latest.colors.join('|')}`)
            }
          }
          handle.start()
        },
        () => {
          logKawarp('falha ao carregar a capa', { src: source.src })
          if (aliveRef.current) setFailedSource(sourceKey)
        }
      )
    }

    apply()

    return () => {
      cancelled = true
      if (frame !== null) {
        if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
        else clearTimeout(frame)
      }
    }
  }, [kawarpReady, sourceKey, gradientColors, gradientAngle, proxiedSrc])

  if (!mounted || hasError) return null
  // Sem paleta e sem capa não há o que desenhar; o fallback do painel cobre.
  if (!gradientColors && !proxiedSrc) return null

  return (
    <div
      aria-hidden
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
      style={{ zIndex: -1 }}
    >
      <KawarpCanvas
        onInstance={handleInstance}
        animationSpeed={animationSpeed}
        warpIntensity={warpIntensity}
        blurPasses={blurPasses}
        saturation={saturation}
        scale={scale}
        transitionDuration={transitionDuration}
        tintColor={derivedTintColor}
        tintIntensity={tintIntensity}
        dithering={dithering}
        onError={() => setFailedSource(sourceKey)}
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
