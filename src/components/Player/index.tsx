'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { usePlayerStore } from '@/lib/store'
import { useSidebarStore } from '@/lib/sidebar-store'
import { AnimatePresence, motion } from 'motion/react'
import { popoverVariants, whileTap, TRANSITION, fadeVariants } from '@/lib/motion'
import type { RepeatMode } from '@/lib/store'
import type { Track } from '@/types/music'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { savePlaybackHistory, saveListeningTime } from '@/lib/playback-history'
import { useIsFavorite, useFavoritesStore, useEnsureFavorites, useFavoritesSync } from '@/lib/favorites-store'
import { ExpandedPlayerModal } from '@/components/ExpandedPlayerModal'
import { PlaylistModal } from '@/components/PlaylistModal'
import { useYouTube } from '@/components/YouTubePlayer/context'
import { playerAudioRef, progressDragState } from '@/lib/player-audio'
import { useTrackSeek, useTrackPrev } from '@/hooks/use-player-transport'
import { TrackProgress } from '@/components/Player/TrackProgress'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shuffle, SkipBack, SkipForward, Repeat, Repeat1, Play, Pause, Maximize, Minimize, Music, Heart } from 'lucide-react'

export function Player() {
  /* Referência compartilhada: a hero e o rodapé fazem seek no MESMO `<audio>`. */
  const audioRef = playerAudioRef
  // "Add Button" do cluster esquerdo da barra (spec) — o mesmo PlaylistModal
  // já usado na tabela de faixas e no menu da fila.
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)
  const [failedCoverId, setFailedCoverId] = useState<string | null>(null)
  const [sleepRemaining, setSleepRemaining] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const retryingId = useRef<string | null>(null)
  const supabase = createClient()

  const {
    currentTrack, isPlaying, volume, progress, duration, queue,
    currentPlaylistId, currentPlaylistName, repeat, shuffle,
    crossfadeDuration, sleepTimerMinutes, miniPlayer,
    pause, resume, next, prev, togglePlay,
    setVolume, setProgress, setDuration,
    setRepeat, toggleShuffle, setSleepTimer,
    openExpanded, closeExpanded, isExpandedOpen, queueMinimized, setQueueMinimized, setQueueWidth,
    wideCover, setWideCover,
  } = usePlayerStore()

  /* Ação de biblioteca/favorito real, sem estado paralelo. */
  const isFavorite = useIsFavorite(currentTrack?.id ?? '')
  const toggleFavorite = useFavoritesStore((s) => s.toggle)
  useFavoritesSync(user?.id)
  useEnsureFavorites([currentTrack?.id])

  // Tela cheia: mesma store da sidebar/topbar (irmãos no layout, sem props).
  // A cópia do rodapé existe porque a hero só está no DOM quando aberta — aqui
  // o controle fica sempre à mão.
  const immersive = useSidebarStore((s) => s.immersive)
  const toggleImmersive = useSidebarStore((s) => s.toggleImmersive)
  const setImmersive = useSidebarStore((s) => s.setImmersive)

  /**
   * Um único botão no rodapé abre e fecha a hero.
   *
   * O rodapé é `z-[70]` e o `ExpandedPlayerModal` é `z-[60]`, então o rodapé
   * continua visível por cima da hero quando ela abre — é isso que permite
   * que o mesmo controle faça as duas coisas, depois que o `v` da hero saiu.
   */
  const toggleExpanded = () => (isExpandedOpen ? closeExpanded() : openExpanded())

  /**
   * Abre/fecha a hero **em tela cheia** — mesma ação do ⛶ do rodapé.
   * Compartilhado pelo botão combinado e pela capa do player: clicar na capa
   * tem de levar ao mesmo lugar de clicar no ícone de expandir ao lado da
   * fila, sem depender de qual dos dois estados (hero/immersive) já está ligado.
   */
  const toggleExpandedFullscreen = () => {
    const combinedOn = isExpandedOpen && immersive
    if (combinedOn) {
      /* `closeExpanded` já devolve a navegação; `setImmersive(false)` é
         idempotente e cobre o caso de a hero ter sido fechada por outro caminho. */
      if (isExpandedOpen) closeExpanded()
      if (immersive) setImmersive(false)
    } else {
      if (!isExpandedOpen) openExpanded()
      if (!immersive) toggleImmersive()
    }
  }

  const isYouTubeTrack = currentTrack?.source === 'youtube' && !!currentTrack.youtubeVideoId

  const yt = useYouTube()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const lastSavedTrackId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    if (lastSavedTrackId.current === undefined) {
      // Primeira observação com usuário logado: semeia com a faixa restaurada
      // do reload (ou null). Sem isso, recarregar com música tocando — ou
      // retomar o play — re-inseriria a faixa e anularia o "Limpar histórico".
      lastSavedTrackId.current = currentTrack?.id ?? null
      return
    }
    if (isPlaying && currentTrack && lastSavedTrackId.current !== currentTrack.id) {
      lastSavedTrackId.current = currentTrack.id
      void savePlaybackHistory(user, currentTrack)
    }
  }, [currentTrack?.id, isPlaying, user])

  useEffect(() => {
    if (!isYouTubeTrack) return
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }, [isYouTubeTrack])

  useEffect(() => {
    if (!isYouTubeTrack) {
      const audio = audioRef.current
      if (!audio || !currentTrack) return

      retryingId.current = null

      function attachEvents() {
        audio!.addEventListener('canplay', onCanPlay)
        audio!.addEventListener('ended', onEnded)
        audio!.addEventListener('error', onError)
        audio!.addEventListener('timeupdate', onTimeUpdate)
        audio!.addEventListener('loadedmetadata', onLoadedMetadata)
      }

      const onCanPlay = () => {
        if (usePlayerStore.getState().isPlaying) {
          audio.play().catch(() => {})
        }
      }

      const onEnded = () => {
        const { repeat: currentRepeat } = usePlayerStore.getState()
        if (currentRepeat === 'one') {
          audio.currentTime = 0
          audio.play().catch(() => {})
          return
        }
        next()
      }

      const onError = async () => {
        const trackId = usePlayerStore.getState().currentTrack?.id
        if (!trackId || retryingId.current === trackId) {
          retryingId.current = null
          next()
          return
        }
        retryingId.current = trackId
        try {
          const res = await fetch(`/api/youtube?endpoint=tracks&id=${trackId}`)
          if (!res.ok) throw new Error('fetch failed')
          const data = await res.json()
          const fresh = data.results?.[0] as Track | undefined
          if (fresh?.audio && usePlayerStore.getState().currentTrack?.id === trackId) {
            audio.src = fresh.audio
            audio.load()
            return
          }
        } catch (e) {
          console.error('Erro ao atualizar URL do áudio:', e)
        }
        retryingId.current = null
        next()
      }

      const onTimeUpdate = () => {
        if (!progressDragState.current) setProgress(audio.currentTime)
      }

      const onLoadedMetadata = () => {
        setDuration(audio.duration)
        const saved = usePlayerStore.getState().progress
        if (saved > 0 && saved < audio.duration - 1) {
          audio.currentTime = saved
        }
      }

      if (!currentTrack.audio) {
        const trackId = usePlayerStore.getState().currentTrack?.id
        if (trackId) {
          ;(async () => {
            try {
              const res = await fetch(`/api/youtube?endpoint=tracks&id=${trackId}`)
              if (res.ok) {
                const data = await res.json()
                const fresh = data.results?.[0] as Track | undefined
                if (fresh?.audio && usePlayerStore.getState().currentTrack?.id === trackId) {
                  audio.src = fresh.audio
                  audio.load()
                  attachEvents()
                  return
                }
              }
            } catch (e) {
              console.error('Erro ao buscar áudio:', e)
            }
            next()
          })()
          return
        }
        next()
        return
      }

      audio.volume = volume
      audio.src = currentTrack.audio
      audio.load()

      attachEvents()

      return () => {
        audio.removeEventListener('canplay', onCanPlay)
        audio.removeEventListener('ended', onEnded)
        audio.removeEventListener('error', onError)
        audio.removeEventListener('timeupdate', onTimeUpdate)
        audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      }
    }
  }, [currentTrack?.id, isYouTubeTrack])

  useEffect(() => {
    if (!isYouTubeTrack) {
      const audio = audioRef.current
      if (!audio || !currentTrack || !currentTrack.audio) return
      if (isPlaying) {
        if (audio.readyState >= 2) {
          audio.play().catch(() => {})
        }
      } else {
        audio.pause()
      }
    }
  }, [isPlaying, isYouTubeTrack])

  /* Alguns browsers mobile suspendem o <audio> em segundo plano. Ao voltar,
     se a store ainda pede reprodução, retomamos sem exigir novo clique. */
  useEffect(() => {
    const resumeIfPlaying = () => {
      if (document.visibilityState !== 'visible') return
      const store = usePlayerStore.getState()
      if (!store.isPlaying || !store.currentTrack || store.currentTrack.source === 'youtube') return
      const audio = audioRef.current
      if (audio && audio.paused) audio.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', resumeIfPlaying)
    window.addEventListener('pageshow', resumeIfPlaying)
    return () => {
      document.removeEventListener('visibilitychange', resumeIfPlaying)
      window.removeEventListener('pageshow', resumeIfPlaying)
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  /* Mesmos handlers da hero — `useTrackSeek`/`useTrackPrev` leem a store e
     o elemento de áudio compartilhado, sem estado paralelo. */
  const handleSeek = useTrackSeek()
  const handlePrev = useTrackPrev()

  const showToast = useCallback((msg: string) => {
    /* Um aviso novo substitui o anterior; sem isso o timer antigo apagava
       o novo antes dos 2s e também disparava após o unmount. */
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => setToast(null), 2000)
  }, [])

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current)
    setSleepRemaining(null)

    if (sleepTimerMinutes && sleepTimerMinutes > 0) {
      const endTime = Date.now() + sleepTimerMinutes * 60 * 1000

      timerRef.current = setTimeout(() => {
        pause()
        setSleepTimer(null)
        setSleepRemaining(null)
        showToast(`Sleep timer: música pausada`)
      }, sleepTimerMinutes * 60 * 1000)

      sleepIntervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
        if (remaining <= 0) {
          setSleepRemaining(null)
          return
        }
        const m = Math.floor(remaining / 60)
        const s = remaining % 60
        setSleepRemaining(`${m}:${s.toString().padStart(2, '0')}`)
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current)
    }
  }, [sleepTimerMinutes, pause, setSleepTimer, showToast])

  const handleCrossfade = useCallback(() => {
    if (isYouTubeTrack) {
      pause()
      next()
    } else {
      const audio = audioRef.current
      if (!audio || crossfadeDuration <= 0) return next()

      const fadeInterval = 30
      const steps = Math.floor((crossfadeDuration * 1000) / fadeInterval)
      const stepVolume = volume / steps
      let currentStep = 0

      const fadeOut = setInterval(() => {
        currentStep++
        if (audioRef.current) {
          audioRef.current.volume = Math.max(0, (audioRef.current.volume || volume) - stepVolume)
        }
        if (currentStep >= steps) {
          clearInterval(fadeOut)
          next()
          setTimeout(() => {
            if (audioRef.current) audioRef.current.volume = volume
          }, 50)
        }
      }, fadeInterval)
    }
  }, [crossfadeDuration, volume, next, isYouTubeTrack, pause])

  if (!currentTrack) return null

  const repeatLabel: Record<RepeatMode, string> = { none: 'Sem repeat', one: 'Repeat 1', all: 'Repeat tudo' }
  /* O ícone fica ativo quando a fila está de fato visível — não quando ela
     está minimizada ou escondida pelo modo capa. */
  const queueVisible = isExpandedOpen && !queueMinimized && !wideCover

  return (
    <>
      <audio ref={audioRef} />

      <AnimatePresence>
        {toast && (
          <motion.div className="fixed left-1/2 z-50 -translate-x-1/2 px-4 py-2 text-sm shadow-lg"
            style={{ bottom: 'var(--toast-bottom)', backgroundColor: 'var(--success)', color: 'var(--text-on-accent)' }}
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {sleepRemaining && (
        <div className="fixed right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-2 text-body-medium shadow-elevation-3"
          style={{ bottom: 'var(--toast-bottom)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {sleepRemaining}
          <button onClick={() => setSleepTimer(null)} className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:text-primary state-layer" aria-label="Cancelar sleep timer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Mini-player mobile: `fixed` acima da bottom nav; com a hero aberta ele
          assume o lugar da nav (escondida na Sidebar) e respeita a safe area.
          `miniPlayer` reduz o rodapé a capa + metadados + play/pause. */}
      <footer
        className="player-footer fixed left-0 right-0 z-[70] flex flex-col justify-center rounded-t-[var(--shape-large)] border-t border-outline-variant px-3 md:hidden"
        style={{
          bottom: isExpandedOpen ? 'var(--safe-bottom)' : 'var(--chrome-bottom)',
          height: isExpandedOpen || miniPlayer ? 'var(--player-mini-h)' : 'var(--player-mobile-h)',
        }}
      >
        {/* Estrutura extraída da referência: capa à esquerda; à direita, um
            stack com metadados/ação, progresso e controles. */}
        <div className="flex w-full min-w-0 flex-row items-center gap-3 py-1.5">
          <button onClick={toggleExpandedFullscreen} className="h-12 w-12 flex-shrink-0" aria-label={isExpandedOpen && immersive ? 'Sair da tela cheia' : 'Abrir player em tela cheia'}>
            {failedCoverId !== currentTrack.id && currentTrack.image ? (
              <img src={currentTrack.image} alt="" className="h-12 w-12 rounded-md object-cover"
                onError={() => setFailedCoverId(currentTrack.id)} />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-md" style={{ backgroundColor: 'var(--surface-container-highest)' }}>
                <Music className="h-5 w-5" style={{ color: 'var(--text-disabled)' }} aria-hidden="true" />
              </span>
            )}
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* Metadados + ação de biblioteca no canto superior direito. */}
            <div className="flex min-w-0 items-center gap-2">
              <button
                /* Sem as setas, os metadados alternam a hero: abrir e fechar. */
                onClick={toggleExpanded}
                className="min-w-0 flex-1 text-left state-layer rounded-lg"
                aria-label={isExpandedOpen ? 'Recolher player expandido' : 'Abrir player expandido'}
              >
                <p className="truncate text-body-medium font-semibold">{currentTrack.name}</p>
                <p className="truncate text-body-medium" style={{ color: 'var(--text-secondary)' }}>{currentTrack.artist_name}</p>
              </button>
              {!miniPlayer && !isExpandedOpen && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!user) { router.push('/login'); return }
                    await toggleFavorite(currentTrack)
                  }}
                  className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full state-layer"
                  style={{ color: isFavorite ? 'var(--accent-from)' : 'var(--text-secondary)' }}
                  aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  aria-pressed={isFavorite}
                  title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <Heart className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              )}
              {miniPlayer && !isExpandedOpen && (
                <button onClick={togglePlay}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full state-layer"
                  style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                  aria-label={isPlaying ? 'Pausar' : 'Tocar'}>
                  {isPlaying ? (
                    <Pause className="h-5 w-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" />
                  ) : (
                    <Play className="h-5 w-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" />
                  )}
                </button>
              )}
            </div>

            {/* Progresso apenas com duração válida. */}
            {!isExpandedOpen && !miniPlayer && duration > 0 && (
              <TrackProgress compact className="py-0.5" />
            )}

            {/* Controles inferiores: shuffle, anterior, play/pause, próxima e
                fila. Repeat é secundário e só aparece quando há largura. */}
            {!isExpandedOpen && !miniPlayer && (
              <div className="flex w-full items-center justify-between gap-0.5">
                <button onClick={toggleShuffle}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full state-layer"
                  style={{ color: shuffle ? 'var(--accent-from)' : 'var(--text-secondary)' }}
                  title={shuffle ? 'Desativar shuffle' : 'Ativar shuffle'}
                  aria-label={shuffle ? 'Desativar shuffle' : 'Ativar shuffle'}
                  aria-pressed={shuffle}>
                  <Shuffle className="h-5 w-5" />
                </button>
                <button onClick={handlePrev} className="inline-flex h-11 w-11 items-center justify-center rounded-full state-layer" style={{ color: 'var(--text-secondary)' }} title="Anterior" aria-label="Faixa anterior">
                  <SkipBack className="h-5 w-5" fill="currentColor" />
                </button>
                <button onClick={togglePlay}
                  className="flex h-12 w-12 items-center justify-center rounded-full state-layer"
                  style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                  aria-label={isPlaying ? 'Pausar' : 'Tocar'}>
                  {isPlaying ? (
                    <Pause className="h-5 w-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" />
                  ) : (
                    <Play className="h-5 w-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" />
                  )}
                </button>
                <button onClick={next} className="inline-flex h-11 w-11 items-center justify-center rounded-full state-layer" style={{ color: 'var(--text-secondary)' }} title="Próxima" aria-label="Próxima faixa">
                  <SkipForward className="h-5 w-5" fill="currentColor" />
                </button>
                <button onClick={() => {
                  const modes: RepeatMode[] = ['none', 'all', 'one']
                  setRepeat(modes[(modes.indexOf(repeat) + 1) % modes.length])
                }}
                  className="hidden min-[400px]:inline-flex h-11 w-11 items-center justify-center rounded-full state-layer"
                  style={{ color: repeat !== 'none' ? 'var(--accent-from)' : 'var(--text-secondary)' }}
                  title={repeatLabel[repeat]}
                  aria-label={repeatLabel[repeat]}>
                  {repeat === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* Rodapé completo: desktop. Os controles que antes eram `md:hidden`
          dentro dele foram movidos para o rodapé mobile acima. */}
      <footer
        className="player-footer relative z-[70] hidden h-20 flex-shrink-0 items-center border-t border-outline-variant px-4 md:flex"
      >
        <div className="flex items-center gap-3 w-72">
          <button onClick={toggleExpandedFullscreen} className="flex-shrink-0" aria-label={isExpandedOpen && immersive ? 'Sair da tela cheia' : 'Abrir player em tela cheia'}>
            <img src={currentTrack.image} alt={currentTrack.name} className="w-12 h-12 rounded object-cover flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-body-large font-semibold truncate">{currentTrack.name}</p>
            </div>
            <p className="text-body-medium truncate" style={{ color: 'var(--text-secondary)' }}>{currentTrack.artist_name}</p>
            {currentPlaylistId && (
              <Link href={`/playlists/${currentPlaylistId}`}
                className="text-label-medium truncate hover:underline"
                style={{ color: 'var(--accent-from)' }}
                onClick={(e) => e.stopPropagation()}>
                {currentPlaylistName}
              </Link>
            )}
          </div>

          {/* "Add Button" do spec. Só no desktop: o cluster tem w-40 no mobile
              e os 48px do botão espremeriam o título. Lá a fila já expõe a
              mesma ação no menu [...]. */}
          <button
            onClick={() => setPlaylistOpen(true)}
            className="hidden md:inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-colors state-layer"
            style={{ color: 'var(--text-secondary)' }}
            title="Adicionar à playlist"
            aria-label="Adicionar à playlist"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <PlaylistModal open={playlistOpen} onClose={() => setPlaylistOpen(false)} track={currentTrack} />
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <button onClick={toggleShuffle}
              className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors state-layer"
              style={{ color: shuffle ? 'var(--accent-from)' : 'var(--text-secondary)' }}
              title={shuffle ? 'Desativar shuffle' : 'Ativar shuffle'}
              aria-label={shuffle ? 'Desativar shuffle' : 'Ativar shuffle'}
              aria-pressed={shuffle}>
              <Shuffle className="w-5 h-5" />
            </button>

            <button onClick={handlePrev} className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors state-layer" style={{ color: 'var(--text-secondary)' }} title="Anterior" aria-label="Faixa anterior">
              <SkipBack className="w-6 h-6" fill="currentColor" />
            </button>

            <motion.button onClick={togglePlay}
              className="h-12 w-12 rounded-full flex items-center justify-center state-layer"
              style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
              aria-label={isPlaying ? 'Pausar' : 'Tocar'}
              whileHover={{ scale: 1.05 }}
              whileTap={whileTap}
              transition={TRANSITION.press}>
              {isPlaying ? (
                <Pause className="w-6 h-6" style={{ color: 'var(--bg-base)' }} fill="currentColor" />
              ) : (
                <Play className="w-6 h-6" style={{ color: 'var(--bg-base)' }} fill="currentColor" />
              )}
            </motion.button>

            <button onClick={next} className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors state-layer" style={{ color: 'var(--text-secondary)' }} title="Próxima" aria-label="Próxima faixa">
              <SkipForward className="w-6 h-6" fill="currentColor" />
            </button>

            <button onClick={() => {
              const modes: RepeatMode[] = ['none', 'all', 'one']
              const idx = modes.indexOf(repeat)
              setRepeat(modes[(idx + 1) % modes.length])
            }}
              className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors relative state-layer"
              style={{ color: repeat !== 'none' ? 'var(--accent-from)' : 'var(--text-secondary)' }}
              title={repeatLabel[repeat]}
              aria-label={repeatLabel[repeat]}>
              {repeat === 'one' ? (
                <Repeat1 className="w-5 h-5" />
              ) : (
                <Repeat className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Uma só implementação de seek: a mesma barra é usada pela hero. */}
          <TrackProgress />
        </div>

        <div className="w-auto md:w-72 flex items-center justify-end gap-2">
          <button
            onClick={() => {
              /* Apaga a largura que o arraste da divisória possa ter deixado:
                 o botão do rodapé reassume o controle da coluna. */
              setQueueWidth(null)
              if (wideCover) {
                /* Sai do modo capa em tela cheia e devolve a fila na posição
                   minimizada original. Sem isto o clique girava o estado da
                   fila por baixo do wideCover — que ficava true na store da
                   NowPlaying e a coluna nunca mais voltava. */
                setWideCover(false)
                setQueueMinimized(true)
              } else if (!isExpandedOpen) {
                setQueueMinimized(true)
                openExpanded()
              } else {
                setQueueMinimized(!queueMinimized)
              }
            }}
            className={`h-12 w-12 hidden md:inline-flex items-center justify-center rounded-full transition-colors state-layer ${
              queueVisible ? 'text-[var(--accent-from)]' : ''
            }`}
            style={queueVisible ? undefined : { color: 'var(--text-secondary)' }}
            title="Fila"
            aria-label="Alternar fila"
            aria-pressed={queueVisible}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h13" />
            </svg>
          </button>

          {/* Botão combinado "tela cheia + player expandido". Substituiu os dois
              controles que moravam aqui separados (tela cheia e Chevron de
              abrir/recolher): um clique entra na hero já em tela cheia —
              `openExpanded` + `toggleImmersive` — e um clique no mesmo botão
              sai da hero e devolve Topbar/sidebar/nav de uma vez. Os ícones são
              o par ⛶ (Maximize/Minimize do lucide), gêmeos do botão da
              divisa; o estado ativo
              se deriva de `isExpandedOpen && immersive` pra nada dessincronizar
              quando um dos dois entra por outro caminho (avatar/Esc).

              `hidden md:inline-flex`: no mobile a hero já abre cobrindo tudo —
              o Chevron logo abaixo (md:hidden) segue sendo o acesso rápido. */}
          <button
            onClick={toggleExpandedFullscreen}
            className={`h-12 w-12 hidden md:inline-flex items-center justify-center rounded-full transition-colors state-layer ${
              isExpandedOpen && immersive ? 'text-[var(--accent-from)]' : ''
            }`}
            style={isExpandedOpen && immersive ? undefined : { color: 'var(--text-secondary)' }}
            title={isExpandedOpen && immersive ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}
            aria-label={isExpandedOpen && immersive ? 'Sair da tela cheia' : 'Abrir player em tela cheia'}
            aria-pressed={isExpandedOpen && immersive}
          >
            {isExpandedOpen && immersive ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          <SleepTimerDropdown />

          <div className="items-center gap-1.5 flex">
            <svg className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Volume"
              className="w-14 md:w-20 h-1 accent-[var(--accent-from)]" />
          </div>

        </div>
      </footer>

      <ExpandedPlayerModal />
    </>
  )
}

function SleepTimerDropdown() {
  const { sleepTimerMinutes, setSleepTimer } = usePlayerStore()
  const [open, setOpen] = useState(false)

  const options = [
    { label: '5 min', value: 5 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '60 min', value: 60 },
  ]

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="h-12 w-12 inline-flex items-center justify-center rounded-full transition-colors state-layer"
        style={{ color: sleepTimerMinutes ? 'var(--accent-from)' : 'var(--text-secondary)' }}
        title="Sleep timer"
        aria-label="Sleep timer"
        aria-haspopup="menu"
        aria-expanded={open}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <div key="sleep-backdrop" className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        )}
        {open && (
          <motion.div key="sleep-menu" className="absolute bottom-full right-0 mb-2 z-50 rounded-xl p-2 shadow-elevation-3 border border-outline-variant min-w-[160px]"
            style={{ backgroundColor: 'var(--bg-elevated)', transformOrigin: 'bottom right' }}
            variants={popoverVariants}
            initial="hidden"
            animate="visible"
            exit="exit">
            {sleepTimerMinutes && (
              <button onClick={() => { setSleepTimer(null); setOpen(false) }}
                className="w-full text-left px-4 min-h-[48px] rounded-lg text-body-medium transition-colors hover:bg-state-hover state-layer"
                style={{ color: 'var(--accent-from)' }}>
                Desativar timer
              </button>
            )}
            {options.map((opt) => (
              <button key={opt.value}
                onClick={() => { setSleepTimer(opt.value); setOpen(false) }}
                className="w-full text-left px-4 min-h-[48px] rounded-lg text-body-medium transition-colors hover:bg-state-hover state-layer"
                style={{ color: sleepTimerMinutes === opt.value ? 'var(--accent-from)' : 'var(--text-primary)' }}>
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
