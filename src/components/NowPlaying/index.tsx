'use client'

import { useEffect, useState, useRef, useCallback, memo, Fragment } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePlayerStore } from '@/lib/store'
import { useSidebarStore } from '@/lib/sidebar-store'
import { formatDuration } from '@/lib/spotify'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Json } from '@/types/database'
import type { Track } from '@/types/music'
import { useEnsureFavorites, useFavoritesStore, useFavoritesSync, useIsFavorite } from '@/lib/favorites-store'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Play, Pause,
  Music, Trash2, MoreHorizontal, Share2, Maximize2, Minimize2,
} from 'lucide-react'
import { useTrackHeroColor } from '@/hooks/use-track-hero-color'
import { getHighResCoverUrl } from '@/lib/image-utils'
import { useMenu, MenuItem, MenuPanel, MenuPresence } from '@/components/ui/Menu'
import { PlaylistModal } from '@/components/PlaylistModal'
import { shareContent } from '@/components/ShareButton'
import { motion } from 'motion/react'
import { confirmPopProps } from '@/lib/motion'
import { useConfirmAnimation } from '@/lib/motion-hooks'

function queueIndexFromItemKey(key: string | number): number {
  const parsed = Number(String(key).split('::')[0])
  return Number.isFinite(parsed) ? parsed : -1
}

/**
 * Rótulo de seção da fila (spec: "Tocando agora" / "Próximas").
 *
 * É um `<p>` comum, não um item do dnd-kit: fica DENTRO do `SortableContext`
 * mas fora do array `items`, então não arrasta e não desloca os índices
 * globais que `onPlay(index)` / `onRemove(index)` usam.
 */
function QueueSection({ label }: { label: string }) {
  return (
    <p
      className="px-3 pt-4 pb-1 text-label-medium font-semibold uppercase tracking-widest"
      style={{ color: 'var(--text-disabled)' }}
    >
      {label}
    </p>
  )
}

const SortableQueueItem = memo(function SortableQueueItem({ track, sortableId, index, displayNumber, isCurrent, isPlaying, onPlay, onRemove, onVisitArtist, minimized }: {
  track: Track; sortableId: string; index: number; displayNumber: number; isCurrent: boolean; isPlaying: boolean;
  onPlay: (index: number) => void; onRemove: (index: number) => void; onVisitArtist: (artistId: string) => void; minimized?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId })
  const { open: menuOpen, close: closeMenu, triggerProps, panelProps } = useMenu()
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    /* `border-left` ocupa espaço no box: só a faixa atual recebeu 3px, então o
       conteúdo dela ficava deslocado 3px à direita das vizinhas. Todas passam
       a ter os 3px — transparentes nas demais — e só a atual é pintada. */
    borderLeft: isCurrent ? '3px solid' : '3px solid transparent',
    borderImage: isCurrent ? 'linear-gradient(180deg, var(--accent-from), var(--accent-to)) 1' : undefined,
  }
  const words = track.name.split(/\s+/)
  const displayName = minimized && words.length > 2 ? `${words.slice(0, 2).join(' ')}…` : track.name

  return (
    <div
      ref={setNodeRef}
      style={style}
      /* Linha inteira como área de arraste (padrão Spotify). O sensor já exige
         `distance: 8`, então clique e hover seguem normais — só um arraste acima
         de 8px reordena. `md:touch-none` libera o gesto só no desktop: em telas
         de toque ele disputaria com o scroll vertical da lista. */
      {...attributes}
      {...listeners}
      /* `attributes` do dnd-kit vem com `role="button"` + `tabIndex={0}` — feitos
         para o elemento ser o próprio botão de arrastar. Aqui a linha é um
         contêiner com botões dentro, e o projeto só tem `PointerSensor` (sem
         arraste por teclado), então sobrariam N paradas de tab inúteis e uma
         semântica errada. */
      role="listitem"
      tabIndex={undefined}
      className={`flex items-center ${minimized ? 'gap-1.5 px-1' : 'gap-3 px-2'} py-2 rounded-lg group transition-colors md:touch-none ${
        /* `--surface-container-highest` (#181818), não `--bg-elevated`: este
           painel passou a ser #121212, e o hover ia pintar a mesma cor do fundo. */
        isCurrent ? 'bg-[var(--accent-muted)]' : 'hover:bg-[var(--surface-container-highest)]'
      }`}
    >
      {/* Coluna do número: equalizador na faixa atual, play no hover nas demais.
          Substitui o GripVertical de 36px, que ficava abaixo do mínimo M3 de 48px. */}
      <div className="w-6 flex-none flex items-center justify-center">
        {isCurrent ? (
          isPlaying ? (
            <div className="animate-waveform" aria-hidden>
              <span /><span /><span />
            </div>
          ) : (
            <Pause className="w-3.5 h-3.5" fill="currentColor" style={{ color: 'var(--accent-from)' }} />
          )
        ) : (
          <>
            <span className="group-hover:hidden text-label-medium tabular-nums" style={{ color: 'var(--text-disabled)' }}>
              {displayNumber}
            </span>
            <button
              onClick={() => onPlay(index)}
              className="hidden group-hover:inline-flex w-6 h-12 items-center justify-center"
              style={{ color: 'var(--text-primary)' }}
              aria-label={`Tocar ${track.name}`}
            >
              <Play className="w-4 h-4" fill="currentColor" />
            </button>
          </>
        )}
      </div>

      {/* A capa nunca some mais: antes o waveform a substituía enquanto tocava,
          escondendo a arte da faixa atual. */}
      <button onClick={() => onPlay(index)} className="w-10 h-10 rounded flex-shrink-0 overflow-hidden relative">
        {track.image ? (
          <img src={track.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <Music className="w-4 h-4" style={{ color: 'var(--text-disabled)' }} />
          </div>
        )}
        {!isCurrent && (
          <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden>
            <Play className="w-4 h-4 text-white" fill="white" />
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-body-medium truncate ${isCurrent ? 'font-semibold' : ''}`} style={{ color: isCurrent ? 'var(--accent-from)' : 'var(--text-primary)' }}>
          {displayName}
        </p>
        {/* Nome do artista em laranja, como no resto da hero. No modo minimizado
            a duração vai na mesma linha — ela segue neutra, senão os dois modos
            terminariam com a duração em cores diferentes (cinza no expandido,
            laranja no enxuto). */}
        <p className="text-body-medium truncate">
          <span style={{ color: 'var(--text-accent)' }}>{track.artist_name}</span>
          {minimized && (
            <span style={{ color: 'var(--text-disabled)' }}> · {formatDuration(Math.floor(track.duration))}</span>
          )}
        </p>
      </div>

      {/* Duração em coluna própria à direita (Spotify). Antes era uma terceira
          linha de texto sob o artista, alongando a linha sem necessidade. */}
      {!minimized && (
        <span className="flex-none text-label-medium tabular-nums" style={{ color: 'var(--text-disabled)' }}>
          {formatDuration(Math.floor(track.duration))}
        </span>
      )}

      <div className="relative flex-none z-10">
        {/* "Mais opções" some no desktop até o mouse entrar na linha — o pedido
             é que ele só apareça e só acione em cima das faixas. `opacity` +
             `pointer-events` e não `hidden`: esconder por display encolheria a
             linha a cada hover e empurraria duração e texto pra direita.

             No mobile ele continua sempre visível, e não é capricho: não existe
             hover em tela de toque, e este botão é o único acesso ao menu
             (adicionar à playlist, compartilhar, ver artista, remover). Sem ele
             visível a fila mobile perderia as quatro ações.

             `menuOpen` mantém o gatilho pintado com o menu aberto, senão ele
             sumiria quando o mouse saísse da linha pra entrar no painel. */}
        <button
          {...triggerProps}
          className={`h-12 w-12 rounded-full inline-flex items-center justify-center transition state-layer text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${
            menuOpen
              ? 'md:opacity-100'
              : 'md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:focus-visible:opacity-100 md:focus-visible:pointer-events-auto'
          }`}
          title="Mais opções"
          aria-label={`Mais opções para ${track.name}`}
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
        <MenuPresence open={menuOpen}>
          <MenuPanel {...panelProps} align="right">
            <MenuItem onClick={() => { closeMenu(); setPlaylistOpen(true) }}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Adicionar à playlist
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeMenu()
                void shareContent({ title: track.name, text: `Ouça "${track.name}" de ${track.artist_name} no Ember Music` })
              }}
            >
              <Share2 className="w-5 h-5 flex-shrink-0" />
              Compartilhar
            </MenuItem>
            <MenuItem onClick={() => { closeMenu(); onVisitArtist(track.artist_id) }}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Ver artista
            </MenuItem>
            <MenuItem danger onClick={() => { closeMenu(); onRemove(index) }}>
              <Trash2 className="w-5 h-5 flex-shrink-0" />
              Remover da fila
            </MenuItem>
          </MenuPanel>
        </MenuPresence>
        <PlaylistModal open={playlistOpen} onClose={() => setPlaylistOpen(false)} track={track} />
      </div>
    </div>
  )
})

export default function NowPlaying({ onClose }: { onClose?: () => void }) {
  const router = useRouter()
  const [hdCover, setHdCover] = useState<{ id: string; src: string } | null>(null)
  const [hdFailed, setHdFailed] = useState<string | null>(null)
  const [baseFailed, setBaseFailed] = useState<string | null>(null)
  const [showQueueOnMobile, setShowQueueOnMobile] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const [suggestions, setSuggestions] = useState<Track[]>([])
  const supabase = createClient()

  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const queue = usePlayerStore((s) => s.queue)
  const isExpandedOpen = usePlayerStore((s) => s.isExpandedOpen)
  const queueMinimized = usePlayerStore((s) => s.queueMinimized)
  const play = usePlayerStore((s) => s.play)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const reorderQueue = usePlayerStore((s) => s.reorderQueue)
  const clearQueue = usePlayerStore((s) => s.clearQueue)
  // O rodapé padrão tem h-20 (80px); em mini-mode é h-14 só no mobile e
  // `md:hidden` no desktop (sem rodapé). O respiro da hero acompanha isso
  // para não abrir uma banda vazia no fim.
  const miniPlayer = usePlayerStore((s) => s.miniPlayer)
  // Âncora das seções "Tocando agora" / "Próximas". Mantém o índice GLOBAL do
  // array da fila de propósito: a numeração do dnd e os handlers não mudam.
  const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id)

  // Tela cheia: esconde Topbar, coluna lateral e navegação inferior.
  const immersive = useSidebarStore((s) => s.immersive)
  const toggleImmersive = useSidebarStore((s) => s.toggleImmersive)

  // Espelha o modo no `<html>` para o CSS conseguir dar a faixa do Topbar
  // liberada (64px) de volta pra capa. Sai junto com o componente, que só
  // existe enquanto a hero está aberta.
  useEffect(() => {
    document.documentElement.classList.toggle('immersive', immersive)
    return () => document.documentElement.classList.remove('immersive')
  }, [immersive])

  // Leva à página do artista da faixa, onde o usuário pode explorar novas faixas dele
  const visitArtist = useCallback((artistId: string) => {
    if (!artistId) return
    if (onClose) onClose()
    router.push(`/artists/${artistId}`)
  }, [onClose, router])

  const isFav = useIsFavorite(currentTrack?.id ?? '')
  const confirmFavorite = useConfirmAnimation()
  const toggleFavorite = useFavoritesStore((s) => s.toggle)
  useFavoritesSync(user?.id)
  useEnsureFavorites(currentTrack ? [currentTrack.id] : [])

  const isYouTubeTrack = currentTrack?.source === 'youtube' && !!currentTrack.youtubeVideoId

  // Capa em alta resolução para extração de cor (yt-image-quality: maxresdefault / =w1200)
  // O hook `useTrackHeroColor` já faz fallback automático via proxy se CORS falhar.
  const heroCoverUrl = currentTrack?.image
    ? getHighResCoverUrl(currentTrack.image, currentTrack.youtubeVideoId)
    : isYouTubeTrack && currentTrack?.youtubeVideoId
      ? `https://i.ytimg.com/vi/${currentTrack.youtubeVideoId}/maxresdefault.jpg`
      : ''

  // Capa base para exibição (hdCover faz o upgrade progressivo)
  const baseCover = currentTrack?.image
    ? currentTrack.image
    : isYouTubeTrack && currentTrack?.youtubeVideoId
      ? `https://i.ytimg.com/vi/${currentTrack.youtubeVideoId}/hqdefault.jpg`
      : ''

  const coverRef = useRef<HTMLDivElement>(null)

  /* Hook de cor do hero: extração K-means + scoring perceptual + cache + cancelamento.

     Sem `fallbackColor`: quando não há cor (capa ausente ou ilegível),
     `heroColor` fica `null` e o CSS aplica `.now-cover-panel-empty`
     (`var(--bg-nowplaying-fallback)`). Um hex sintético aqui só poluiria o
     gradiente — e `var(--accent-from)` nem é hex, geraria `#NaNNaNNaN`. */
  const { color: heroColor } = useTrackHeroColor({
    coverUrl: heroCoverUrl || undefined,
    trackId: currentTrack?.id,
  })

  const playTrackAt = useCallback((queueIndex: number) => {
    const track = queue[queueIndex]
    if (!track) return
    const store = usePlayerStore.getState()
    if (store.currentTrack?.id === track.id) {
      store.togglePlay()
      return
    }
    store.play(track, store.originalQueue, store.currentPlaylistId ?? undefined, store.currentPlaylistName ?? undefined)
  }, [queue])

  // Só promove para a capa HD quando ela realmente carrega (evita 404/flash quebrado)
  useEffect(() => {
    if (!currentTrack?.id || !baseCover) return
    // Kill-switch: NEXT_PUBLIC_COVER_HD=off restaura o comportamento da v.2_reordenar
    if (process.env.NEXT_PUBLIC_COVER_HD === 'off') return
    // Se a HD já falhou para esta faixa, não tenta de novo (mantém a capa base)
    if (hdFailed === currentTrack.id) return
    const hd = getHighResCoverUrl(currentTrack.image, currentTrack.youtubeVideoId)
    if (!hd || hd === baseCover) return
    let cancelled = false
    const probe = new Image()
    probe.onload = () => {
      if (cancelled) return
      // O YouTube pode responder 200 com uma placeholder cinza de 120x90 quando
      // o maxresdefault não existe de verdade — só promove se a HD for real (>=640px)
      if (probe.naturalWidth < 640) {
        setHdFailed(currentTrack.id)
        return
      }
      setHdCover({ id: currentTrack.id, src: hd })
    }
    probe.onerror = () => {
      if (!cancelled) setHdFailed(currentTrack.id)
    }
    probe.src = hd
    return () => {
      cancelled = true
    }
  }, [currentTrack?.id, currentTrack?.image, currentTrack?.youtubeVideoId, baseCover, hdFailed])

  useEffect(() => {
    const main = document.querySelector('main')
    if (main) main.style.overflow = 'hidden'
    return () => {
      if (main) main.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    if (queue.length > 0 || !currentTrack?.artist_id) return
    const controller = new AbortController()
    fetch(`/api/youtube?endpoint=related&id=${currentTrack.artist_id}&exclude=${currentTrack.id}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('related failed'))))
      .then((data) => {
        if (!controller.signal.aborted) setSuggestions(((data.results ?? []) as Track[]).slice(0, 6))
      })
      .catch(() => {
        if (!controller.signal.aborted) setSuggestions([])
      })
    return () => controller.abort()
  }, [queue.length, currentTrack?.artist_id, currentTrack?.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Esc desfaz a tela cheia antes de fechar a hero: uma tecla, dois níveis,
      // como nos apps de vídeo. `getState()` de propósito — o handler não
      // precisa se re-inscrever toda vez que o modo muda.
      if (useSidebarStore.getState().immersive) {
        useSidebarStore.getState().setImmersive(false)
        return
      }
      if (onClose) onClose()
      else if (!isExpandedOpen) router.back()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, onClose, isExpandedOpen])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const touchStartY = useRef(0)
  const touchDelta = useRef(0)
  const [swipeOffset, setSwipeOffset] = useState(0)

  if (!currentTrack) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Nenhuma faixa em reprodução</p>
      </div>
    )
  }

  const dominantColor = heroColor?.primary ?? null

  /* Cores da capa viram custom properties (`--hero-c1/2/3` + `--hero-glow`) em
     vez de entrarem embutidas no `radial-gradient`. A composição do gradiente
     mora no CSS (`.now-cover-panel`), e é o `@property` daqui de baixo que
     torna a troca animável.

     Sem isso o `transition: background` da versão anterior não fazia nada:
     `background-image` não interpola entre dois `radial-gradient`, então a
     cor pulava num frame só. Com as cores tipadas como `<color>`, o
     navegador interpola o valor e o gradiente se redesenha a cada frame.

     A parada-base é `--hero-c2`, e ela carrega a `primary` — a cor mais
     predominante da capa (K-means + scoring QC/QD/QR) — a 95% de alpha.
     As outras duas descem em opacidade até o `--bg-base`.
     O glow em 10% pra não competir com a base.

     `transparent` quando não há cor, e o CSS decide o fallback. */
  const panelStyle: CSSProperties & Record<string, string> = heroColor
    ? {
        '--hero-c1': `${heroColor.primary}99`,
        '--hero-c2': `${heroColor.primary}F2`,
        '--hero-c3': `${heroColor.primary}59`,
        '--hero-glow': `${heroColor.primary}1A`,
        border: `1px solid ${heroColor.primary}4D`,
      }
    : { border: '1px solid var(--outline-variant)' }

  /* Sombra da capa acompanha a cor dominante (30%). Fora da cor, preto
     genérico — ela existe pra destacar a capa do fundo, não pra dizer cor. */
  const coverShadow = dominantColor
    ? `0 32px 64px ${dominantColor}4D`
    : '0 32px 64px rgba(0,0,0,0.5)'

  async function handleFavorite() {
    if (!user || !currentTrack) return
    // Fire before the await so the confirmation lands on the click.
    if (!isFav) confirmFavorite.play()
    await toggleFavorite(currentTrack)
  }

  async function handleDownload() {
    if (isYouTubeTrack) { showToast('Download não disponível para faixas do YouTube'); return }
    if (!currentTrack?.audio) { showToast('Áudio não disponível para download'); return }
    if (!user) { showToast('Faça login para baixar músicas'); return }
    try {
      const res = await fetch(currentTrack.audio)
      if (!res.ok) throw new Error('download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentTrack.name} - ${currentTrack.artist_name}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Download concluído!')
      const { error } = await supabase.from('downloads').insert({
        user_id: user.id,
        track_id: currentTrack.id,
        track_name: currentTrack.name,
        artist_name: currentTrack.artist_name ?? 'Desconhecido',
        cover_url: currentTrack.image ?? null,
        file_size_bytes: blob.size,
        track_data: currentTrack as unknown as Json,
      })
      if (error) console.error('Erro ao salvar registro de download:', error)
    } catch { showToast('Erro ao baixar. Tente novamente.') }
  }

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  function handleTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement
    if (target.closest('.queue-scroll')) return
    touchStartY.current = e.touches[0].clientY
    touchDelta.current = 0
  }

  function handleTouchMove(e: React.TouchEvent) {
    const target = e.target as HTMLElement
    if (target.closest('.queue-scroll')) return
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy <= 0) { setSwipeOffset(0); return }
    touchDelta.current = dy
    setSwipeOffset(dy)
  }

  function handleTouchEnd() {
    if (touchDelta.current > 100) {
      if (onClose) {
        onClose()
      } else {
        setSwipeOffset(window.innerHeight)
        setTimeout(() => router.back(), 250)
      }
    } else {
      setSwipeOffset(0)
    }
    touchStartY.current = 0
    touchDelta.current = 0
  }

  function handleDragEnd(event: { active: { id: string | number }; over: { id: string | number } | null }) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = queueIndexFromItemKey(active.id)
    const toIndex = queueIndexFromItemKey(over.id)
    if (fromIndex < 0 || fromIndex >= queue.length) return
    if (toIndex < 0 || toIndex >= queue.length) return
    if (fromIndex === toIndex) return
    reorderQueue(fromIndex, toIndex)
  }

  return (
    <div
      className={`now-playing h-full relative flex flex-col overflow-hidden ${miniPlayer ? 'pb-14 md:pb-0' : 'pb-20'} ${onClose ? '' : 'animate-slide-up'}`}
      style={{
        /* O gradiente saiu daqui. Morava nesta raiz em `inset-0` de sangria e
           sumia por baixo do painel da fila, que é opaco; sobrava dele só a
           faixa da capa e o vão do rodapé. Agora ele é o background da coluna
           da capa, com canto e borda — ver comentário naquela div. A raiz fica
           no `bg-base` do escopo (preto no escuro, marfim no claro). */
        background: 'var(--bg-base)',
        /* Só o `transform` transiciona aqui: é o swipe de fechar. O `background`
           de 800ms foi junto com o gradiente para a coluna da capa. Com o dedo
           em cima (`swipeOffset > 0`) a transição é `none` pra barra seguir o
           dedo sem atraso — antes era `background`, que já não existia mais. */
        transition: swipeOffset > 0 ? 'none' : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
        touchAction: 'pan-x',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* O cabeçalho de 64px com o título da faixa foi removido: ele repetia o
          `<h1>` que já existe logo abaixo da capa. Os dois controles que ele
          abrigava mudaram de lugar — o de tela cheia do desktop foi para a
          divisa entre a capa e a fila, e os do mobile entraram na fileira de
          ações da coluna da capa. */}

      <div className="relative flex-1 flex flex-col md:flex-row gap-4 md:gap-6 min-h-0 px-4 md:px-6 pb-4">
        {/* Painel da capa. Antes eram duas coisas separadas: o `bgGradient`
             (radial da cor dominante da capa) sangrava na raiz da hero inteira
             e sumia por baixo do painel da fila, que é opaco; o `glowTint` era
             um `absolute inset-0` com o mesmo problema. Os dois agora empilham
             nesta div, que é a única que termina exatamente na divisa — o
             `gap-6` de 24px antes do `#121212`.

             A composição (glow chapado por cima, radial de três cores embaixo)
             mora em `.now-cover-panel` no `globals.css`, junto com o
             `@property` que torna as cores interpoláveis. Aqui só entregamos
             os valores via `--hero-c1/2/3` e `--hero-glow` — é isso que
             permite a transição suave entre faixas.

             `rounded-2xl` dá o canto, mesma escala de forma da capa; a borda de
             30% da cor primária fecha o contorno e é o que separa o
             painel do vão preto da raiz — sem ela o canto some contra o
             `bg-base`. `--outline-variant` quando não há capa extraída.

             `hide-scrollbar` porque a rolagem aqui é só rede de segurança para
             viewports curtos — numa altura normal tudo cabe e não há o que rolar.
             Sem ela a trilha apareceria colada na capa. */}
        <div
          className={`now-cover-panel flex-1 md:flex-[3] flex flex-col items-center [justify-content:safe_center] gap-3 md:gap-4 min-h-0 overflow-y-auto overflow-x-hidden hide-scrollbar pt-1 md:pt-2 pb-4 rounded-2xl ${showQueueOnMobile ? 'hidden md:flex' : ''} ${heroColor ? '' : 'now-cover-panel-empty'}`}
          style={panelStyle}
        >
          <div ref={coverRef} className={`now-cover relative flex-shrink-0${queueMinimized ? ' now-cover-min' : ''}`} style={{ aspectRatio: '1' }}>
            {baseCover && baseFailed !== currentTrack.id ? (
              <img
                key={currentTrack.id}
                src={hdCover?.id === currentTrack.id ? hdCover.src : baseCover}
                alt={currentTrack.name}
                className="w-full h-full rounded-2xl object-cover animate-cover-in"
                style={{ boxShadow: coverShadow }}
                onError={(e) => {
                  // Fallback seguro: se a HD falhar, repara para a capa base (v.2_reordenar);
                  // se a base também falhar, mostra o placeholder (sem ícone quebrado)
                  if (hdCover?.id === currentTrack.id && e.currentTarget.src !== baseCover) {
                    setHdCover(null)
                    setHdFailed(currentTrack.id)
                  } else {
                    setBaseFailed(currentTrack.id)
                  }
                }}
              />
            ) : (
              <div key={currentTrack.id} className="w-full h-full rounded-2xl flex items-center justify-center animate-cover-in" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <Music className="w-16 h-16" style={{ color: 'var(--text-disabled)' }} />
              </div>
            )}
          </div>

          <div className={`w-full ${queueMinimized ? 'max-w-[720px]' : 'max-w-[560px]'} text-center space-y-0.5`}>
            <h1 className="text-[28px] md:text-[36px] leading-tight font-bold truncate" style={{ color: 'var(--text-primary)' }} title={currentTrack.name}>
              {currentTrack.name}
            </h1>
            <Link
              href={`/artists/${currentTrack.artist_id}`}
              className="text-base inline-block hover:underline"
              style={{ color: 'var(--text-accent)' }}
            >
              {currentTrack.artist_name}
            </Link>
          </div>

          <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <button onClick={handleDownload} className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors hover:text-[var(--text-primary)] state-layer" aria-label="Download" title="Baixar música">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            {user && (
              <button onClick={handleFavorite} className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors state-layer" aria-label="Favoritar" aria-pressed={isFav}>
                <motion.svg
                  {...confirmPopProps(
                    confirmFavorite.controls,
                    isFav ? {} : { color: 'var(--text-secondary)' },
                  )}
                  className="w-5 h-5 transition-colors duration-150"
                  fill={isFav ? 'url(#favGradientNow)' : 'none'}
                  viewBox="0 0 24 24"
                  stroke={isFav ? 'none' : 'currentColor'}
                  strokeWidth={2}
                >
                  <defs>
                    <linearGradient id="favGradientNow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent-from)" />
                      <stop offset="100%" stopColor="var(--accent-to)" />
                    </linearGradient>
                  </defs>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </motion.svg>
              </button>
            )}
            <button
              onClick={() => visitArtist(currentTrack.artist_id)}
              /* Classe, não `style`: o botão já tem `hover:text-…`, e um estilo
                 inline venceria o hover. Só esta fileira fica laranja — baixar e
                 favoritar continuam neutros (herdam do `div` pai). */
              className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors text-[var(--text-accent)] hover:text-[var(--text-primary)] state-layer"
              aria-label={`Ver artista ${currentTrack.artist_name}`}
              title="Ver mais do artista"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>

            {/* Fila e tela cheia do mobile: moravam no cabeçalho que foi
                removido. Aqui continuam dentro do hero, e o `md:hidden` os
                some no desktop — onde os equivalentes já existem em outros
                lugares (fila no rodapé, tela cheia na divisa entre as
                colunas). Sem esta cópia o mobile perderia a fila inteira e,
                no caso da tela cheia, também a única saída: não existe Esc
                em tela pequena e as outras duas cópias são `md:`. */}
            <button
              onClick={() => setShowQueueOnMobile(!showQueueOnMobile)}
              className={`md:hidden h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors state-layer ${
                showQueueOnMobile ? 'text-[var(--accent-from)]' : ''
              }`}
              style={showQueueOnMobile ? undefined : { color: 'var(--text-secondary)' }}
              aria-label="Fila"
              aria-pressed={showQueueOnMobile}
              title="Fila"
            >
              <Music className="w-5 h-5" />
            </button>

            <button
              onClick={toggleImmersive}
              className={`md:hidden h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors state-layer ${
                immersive ? 'text-[var(--accent-from)]' : ''
              }`}
              style={immersive ? undefined : { color: 'var(--text-secondary)' }}
              aria-label={immersive ? 'Sair da tela cheia' : 'Tela cheia'}
              aria-pressed={immersive}
              title={immersive ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {immersive ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>

          {toast && (
            <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-body-medium shadow-elevation-3 animate-slide-up" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
              {toast}
            </div>
          )}

          <button
            onClick={() => setShowQueueOnMobile(true)}
            className="md:hidden flex items-center gap-2 min-h-[48px] px-5 rounded-full text-label-large transition-colors state-layer"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <Music className="w-5 h-5" />
            Fila
          </button>
        </div>

          {/* Painel flush na borda, como a fila do Spotify: `#121212` — o
              background-base oficial da marca — encostado na direita e na base.
              As margens negativas anulam o `px-4 md:px-6 pb-4` do container
              (linha acima); sem elas sobraria uma moldura preta de 24px em volta,
              que não é como o Spotify desenha a fila. `md:ml-0` devolve a
              margem esquerda no desktop, onde ela é o espaçamento entre as duas
              colunas. O `overflow-hidden` da raiz garante o corte na borda.

              Recolhida, a largura passa a ser 20% da largura visível da hero —
              não do content-box do container, que é onde uma % de flex-item é
              resolvida e que já vem os 48px do `px-6` menores. Daí o
              `+ 9.6px`: 20% dos 48px de padding, devolvidos, fazem o painel
              medir 20% da hero inteira. Em 1440px isso dá 288px — exatamente
              os 288px do antigo `md:w-72`, que era fixo e ignorava a largura
              da tela; agora a proporção sobrevive a qualquer viewport. */}
          <div
            className={`w-full -ml-4 -mr-4 -mb-4 md:ml-0 md:-mr-6 ${queueMinimized ? 'md:w-[calc(20%_+_9.6px)]' : 'md:w-auto md:flex-[2]'} flex flex-col min-h-[calc(100vh-12rem)] md:min-h-0 relative max-h-[calc(100vh-12rem)] md:max-h-none ${showQueueOnMobile ? '' : 'hidden md:flex'}`}
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            {/* Tela cheia na divisa entre a capa e a fila: `-left-14` (−56px)
                passa da largura do botão (48px), então ele fica inteiramente
                fora do painel com 8px de respiro da borda do #121212 — 16px
                dentro do gap e os outros 32px mordendo a coluna da capa.
                Quanto mais pra esquerda, mais ele lê como puxador da
                fronteira e menos como ícone do painel. Continua fora da
                condição do cabeçalho, então existe também com a fila
                recolhida.

                `top-1` deixa o topo a 4px da linha do `border-b` do Topbar no
                desktop e da borda superior da viewport na tela cheia — o
                mínimo sem grudar nas duas, que era o problema do `top-0`.

                Fundo + borda porque ele atravessa duas superfícies diferentes
                (o preto da hero e o #121212 do painel) e chega perto o
                bastante da capa pra encostar nela em telas estreitas; sem
                eles some em qualquer uma delas. */}
            <button
              onClick={toggleImmersive}
              className={`absolute -left-14 top-1 z-10 h-12 w-12 hidden md:inline-flex items-center justify-center rounded-full border border-outline-variant transition-colors state-layer ${
                immersive ? 'text-[var(--accent-from)]' : 'text-[var(--text-secondary)]'
              }`}
              style={{ backgroundColor: 'var(--bg-surface)' }}
              aria-label={immersive ? 'Sair da tela cheia' : 'Tela cheia'}
              aria-pressed={immersive}
              title={immersive ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}
            >
              {immersive ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Sem inset extra: com `-left-14` o botão está inteiramente fora
                do painel, então o cabeçalho mantém o `px-3` original — o
                mesmo alinhamento das linhas da lista (`px-1` + `px-2` = 12px).
                Empurrar o texto pra direita em vez de pra baixo foi o que
                devolveu altura às faixas: sem faixa vazia, o cabeçalho inteiro
                cabe na altura do botão.

                O cabeçalho existe nos dois modos agora, e o `<h2>` "Fila" é o
                rótulo da coluna — some daqui e a coluna recolhida vira uma
                pilha de faixas sem nome. Só o nome da playlist fica de fora do
                modo enxuto: a 20% de largura ele truncaria antes da segunda
                sílaba e não diria nada.

                O `px` acompanha o modo porque o alvo é a mesma linha das
                faixas: expandido são `px-1` + `px-2` = 12px, recolhido são
                `px-0` + `px-1` = 4px. Fixar os 12px nos dois deixaria o
                título 8px à direita da lista quando a coluna encolhe. */}
            <div className={`flex-none ${queueMinimized ? 'px-1' : 'px-3'} py-3`}>
              <h2 className="text-title-medium font-semibold" style={{ color: 'var(--text-primary)' }}>Fila</h2>
              {!queueMinimized && usePlayerStore.getState().currentPlaylistName && (
                <p className="text-body-medium truncate" style={{ color: 'var(--text-secondary)' }}>{usePlayerStore.getState().currentPlaylistName}</p>
              )}
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={queue.map((t, index) => `${index}::${t.id}`)} strategy={verticalListSortingStrategy}>
                {/* O `mt-16` sumiu junto com o cabeçalho recolhido: ele existia
                    porque a fila enxuta não tinha título que absorvesse o topo,
                    e a lista encostava no botão de tela cheia. Com o `<h2>` de
                    volta nos dois modos, o cabeçalho ocupa esse lugar e a
                    margem viraria 64px de vão morto entre "Fila" e a primeira
                    faixa. O botão segue inteiramente fora do painel (`-left-14`
                    o joga no gap e na coluna da capa), então nada encosta nele
                    por dentro. */}
                <div className="flex-1 overflow-y-auto min-h-0 hide-scrollbar queue-scroll flex flex-col max-h-full pb-4">
                  <div className={`${queueMinimized ? 'px-0' : 'px-1'} space-y-1`}>
                  {queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                      <Music className="w-10 h-10 mb-3" style={{ color: 'var(--text-disabled)' }} />
                      <p className="text-body-medium" style={{ color: 'var(--text-secondary)' }}>Nenhuma faixa na fila</p>
                      {!queueMinimized && suggestions.length > 0 && (
                        <div className="w-full mt-4 text-left">
                          <p className="text-label-medium font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-disabled)' }}>
                            Faixas relacionadas
                          </p>
                          {suggestions.map((track) => (
                            <button
                              key={track.id}
                              onClick={() => play(track, suggestions)}
                              className="flex items-center gap-3 w-full px-3 min-h-[56px] rounded-lg hover:bg-[var(--surface-container-highest)] transition-colors text-left state-layer"
                            >
                              {track.image ? (
                                <img src={track.image} alt="" className="w-10 h-10 rounded object-cover flex-none" />
                              ) : (
                                <div className="w-10 h-10 rounded flex items-center justify-center flex-none" style={{ backgroundColor: 'var(--bg-surface)' }}>
                                  <Music className="w-5 h-5" style={{ color: 'var(--text-disabled)' }} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-body-medium truncate" style={{ color: 'var(--text-primary)' }}>{track.name}</p>
                                <p className="text-body-medium truncate" style={{ color: 'var(--text-accent)' }}>{track.artist_name}</p>
                              </div>
                              <Play className="w-5 h-5 flex-none" style={{ color: 'var(--text-disabled)' }} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    queue.map((track, index) => (
                      <Fragment key={`${index}-${track.id}`}>
                        {!queueMinimized && index === currentIndex && (
                          <QueueSection label="Tocando agora" />
                        )}
                        {!queueMinimized && index === currentIndex + 1 && (
                          <QueueSection label="Próximas" />
                        )}
                        <SortableQueueItem
                          track={track}
                          sortableId={`${index}::${track.id}`}
                          index={index}
                          /* "Próximas" recomeça em 1 logo abaixo da atual, como no
                             Spotify, em vez de seguir a posição absoluta (2, 3, 4…). */
                          displayNumber={index > currentIndex ? index - currentIndex : index + 1}
                          isCurrent={track.id === currentTrack.id}
                          isPlaying={isPlaying}
                          onPlay={playTrackAt}
                          onRemove={removeFromQueue}
                          onVisitArtist={visitArtist}
                          minimized={queueMinimized}
                        />
                      </Fragment>
                    ))
                  )}
                </div>
                {!queueMinimized && (
                <div className="sticky bottom-0 z-10 flex-none flex items-center gap-2 px-2 py-4 pointer-events-none" style={{ backgroundColor: 'rgba(49, 45, 41, 0.13)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
                  <button
                    onClick={() => { clearQueue(); showToast('Fila limpa') }}
                    className="pointer-events-auto flex items-center gap-2 px-4 min-h-[48px] rounded-lg text-label-large transition-colors state-layer"
                    style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
                  >
                    <Trash2 className="w-5 h-5" />
                    Limpar fila
                  </button>
                </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  )
}
