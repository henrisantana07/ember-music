'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import type { KawarpRef } from '@kawarp/react'
import { logKawarp } from '@/lib/debug/kawarp'

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
 * A fonte preferida é a **imagem da capa**, não uma paleta já pronta. A URL
 * passa pelo proxy interno (`/api/image-proxy`) e é entregue ao Kawarp via
 * `loadImage()`: é o próprio Kawarp que amostra, borra e faz o domain
 * warping em cima dos pixels reais da capa. A paleta extraída pelo Ember
 * continua existindo, mas só para o CSS da hero (borda, sombra e o fallback
 * `.now-cover-panel`) — ela não alimenta mais o canvas.
 *
 * O gradiente (`loadGradient`) fica apenas como fallback: se a capa não
 * carregar (404/CORS) e ainda houver paleta, ele assume para o fundo não
 * ficar preto. Sem imagem e sem paleta, o CSS do painel cobre enquanto o
 * WebGL inicializa.
 */
export function KawarpBackground({
  coverUrl,
  className = '',
  dimLevel = 0.12,
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
  const wrapperRef = useRef<HTMLDivElement>(null)
  /* Última fonte pedida. Serve para ignorar o término de um `loadImage` antigo
     quando a faixa já trocou enquanto a imagem carregava. */
  const latestSource = useRef<KawarpSource | null>(null)
  const aliveRef = useRef(true)

  /* Diagnóstico visual: abra /reproducao?kawarpDebug=1 para ver um selo com o
     estado do canvas e um contorno vermelho na camada do Kawarp. Fora isso o
     app continua idêntico — nada depende da flag. */
  const setDebugStatus = useCallback((text: string) => {
    const badge = document.getElementById('kawarp-debug')
    if (badge) badge.textContent = `[kawarp] ${text}`
  }, [])

  useEffect(() => {
    aliveRef.current = true

    let badge: HTMLDivElement | null = null
    if (new URLSearchParams(window.location.search).has('kawarpDebug')) {
      badge = document.createElement('div')
      badge.id = 'kawarp-debug'
      Object.assign(badge.style, {
        position: 'fixed',
        right: '12px',
        bottom: '80px',
        zIndex: '999999',
        padding: '8px 12px',
        borderRadius: '8px',
        background: '#000c',
        color: '#5f5',
        font: '12px monospace',
        pointerEvents: 'none',
        maxWidth: '70vw',
      })
      badge.textContent = '[kawarp] iniciando...'
      document.body.appendChild(badge)
      if (wrapperRef.current) wrapperRef.current.style.outline = '2px solid #ff3b30'
    }

    return () => {
      aliveRef.current = false
      badge?.remove()
    }
  }, [])

  const handleInstance = useCallback((instance: KawarpRef | null) => {
    kawarpRef.current = instance
    setKawarpReady(instance !== null)

    /* Atalho de diagnóstico disponível também em produção:
       `__kawarp.instance.sampleSource(16)` mostra os pixels da textura atual.
       Os logs `[ember/kawarp]` continuam só em dev/com flag, para não poluir
       o console do usuário final. */
    if (typeof window !== 'undefined' && instance) {
      ;(window as typeof window & { __kawarp?: KawarpRef }).__kawarp = instance
    }
    logKawarp(instance ? 'canvas montado' : 'canvas desmontado')
    setDebugStatus(instance ? 'canvas montado' : 'canvas desmontado')
  }, [setDebugStatus])

  /* O loop deve permanecer ativo a cada troca de faixa. Parar por
     `prefers-reduced-motion` ou `document.hidden` fazia o canvas ficar parado
     mesmo em uso normal (principalmente em PWA/aba não focada). Só paramos ao
     desmontar o componente. */
  useEffect(() => () => {
    kawarpRef.current?.stop()
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

  /* Cores extraídas são só o fallback do canvas. `loadGradient` divide o
     espaço pelo número de cores − 1, então com uma cor só não existe
     gradiente — nesse caso não há fallback possível e o CSS cobre. */
  const gradientColors = useMemo(() => {
    if (!palette) return null
    const colors = [palette.primary, palette.secondary, palette.tertiary].filter(
      (color): color is string => typeof color === 'string' && color.trim().length > 0
    )
    return colors.length >= 2 ? colors : null
  }, [palette])

  // Deriva o tom do tint a partir da cor primária extraída da capa
  const derivedTintColor = palette?.primary ? hexToRgb01(palette.primary) : undefined

  /* Último recurso: se a faixa não tem capa E não tem paleta (faixa local sem
     artwork, por exemplo), ainda assim mantemos o canvas vivo com um gradiente
     da identidade do app. Antes isso retornava `null` e a hero ficava só com o
     CSS — era exatamente o caso em que nada do Kawarp aparecia. */
  const effectiveGradientColors = useMemo(() => {
    if (gradientColors) return gradientColors
    if (proxiedSrc) return null
    return ['#ff6a00', '#3b2a5a']
  }, [gradientColors, proxiedSrc])

  // A imagem vem primeiro: é ela que o Kawarp deve amostrar. O gradiente só
  // entra na chave quando não há capa, porque a troca de faixa também troca
  // a chave e limpa um erro antigo.
  const sourceKey = proxiedSrc
    ? `image:${proxiedSrc}`
    : effectiveGradientColors
      ? `gradient:${effectiveGradientColors.join('|')}`
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
        setDebugStatus('aguardando núcleo WebGL...')
        if (attempts++ >= MAX_ATTEMPTS) {
          logKawarp('núcleo WebGL não inicializou')
          setDebugStatus('ERRO: WebGL não inicializou')
          if (aliveRef.current) setFailedSource(sourceKey)
          return
        }
        schedule(apply)
        return
      }

      if (!proxiedSrc) {
        // Sem capa, as cores extraídas pelo Ember entram só como último recurso.
        if (!effectiveGradientColors) {
          latestSource.current = null
          return
        }
        const source: GradientSource = {
          kind: 'gradient',
          colors: effectiveGradientColors,
          angle: gradientAngle,
        }
        latestSource.current = source
        logKawarp('gradiente aplicado (sem capa)', { colors: source.colors, angle: source.angle })
        setDebugStatus('gradiente da paleta (sem capa)')
        try {
          handle.loadGradient(source.colors, source.angle)
          handle.start()
          logKawarp('loop de animação do Kawarp ativo')
        } catch {
          logKawarp('falha ao aplicar o gradiente', { colors: source.colors })
          if (aliveRef.current) setFailedSource(sourceKey)
        }
        return
      }

      /* Caminho principal: a capa em si é a textura do Kawarp. Ela passa pelo
         proxy interno, então é same-origin e o WebGL pode ler os pixels sem
         problema de CORS. O Kawarp faz o sampling/blur/warp em cima da imagem. */
      const source: ImageSource = { kind: 'image', src: proxiedSrc }
      latestSource.current = source
      logKawarp('capa enviada ao Kawarp', { src: source.src })
      setDebugStatus('carregando textura da capa...')

      handle.loadImage(source.src).then(
        () => {
          if (!aliveRef.current) return
          // Se a faixa trocou durante o carregamento, um efeito mais novo já
          // pediu outra imagem — não mexe no que está na tela.
          if (latestSource.current !== source) return
          handle.start()
          logKawarp('textura da capa ativa no Kawarp')
          setDebugStatus('textura da capa ATIVA ✓')
        },
        () => {
          logKawarp('falha ao carregar a capa', { src: source.src })
          setDebugStatus('capa falhou — tentando gradiente')
          if (!aliveRef.current || latestSource.current !== source) return

          /* Só agora, com a imagem indisponível, entram as cores já extraídas
             pelo Ember. Assim o fundo não fica preto sem abandonar a imagem
             como fonte preferida. */
          if (effectiveGradientColors) {
            const fallback: GradientSource = {
              kind: 'gradient',
              colors: effectiveGradientColors,
              angle: gradientAngle,
            }
            logKawarp('usando gradiente da paleta como fallback', { colors: fallback.colors })
            try {
              handle.loadGradient(fallback.colors, fallback.angle)
              handle.start()
              setDebugStatus('gradiente da paleta ATIVO (fallback)')
            } catch {
              if (aliveRef.current) setFailedSource(`gradient:${fallback.colors.join('|')}`)
            }
            return
          }
          setFailedSource(sourceKey)
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
  }, [kawarpReady, sourceKey, effectiveGradientColors, gradientAngle, proxiedSrc, setDebugStatus])

  if (!mounted || hasError) return null
  // Sempre há uma fonte (a imagem, a paleta ou o gradiente padrão). Só some
  // de verdade quando o WebGL falhou — e o CSS do painel assume.
  if (!proxiedSrc && !effectiveGradientColors) return null

  return (
    <div
      ref={wrapperRef}
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
