'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePlayerStore } from '@/lib/store'
import type { RepeatMode } from '@/lib/store'
import { formatDuration } from '@/lib/spotify'
import { FastAverageColor } from 'fast-average-color'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Json } from '@/types/database'
import type { Track } from '@/types/music'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Volume2, Volume1, VolumeX,
  Music, Trash2, GripVertical,
} from 'lucide-react'

const fac = new FastAverageColor()

function getAudioEl(): HTMLAudioElement | null {
  return document.querySelector('audio')
}

function SortableQueueItem({ track, index, isCurrent, isPlaying, onPlay, onRemove }: {
  track: Track; index: number; isCurrent: boolean; isPlaying: boolean;
  onPlay: () => void; onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `${index}-${track.id}` })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderLeft: isCurrent ? '3px solid' : undefined,
    borderImage: isCurrent ? 'linear-gradient(180deg, var(--accent-from), var(--accent-to)) 1' : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 px-2 py-2 rounded-lg group transition-colors ${
        isCurrent ? 'bg-[var(--accent-muted)]' : 'hover:bg-[var(--bg-elevated)]'
      }`}
    >
      <button {...attributes} {...listeners} className="p-0.5 cursor-grab active:cursor-grabbing touch-none" style={{ color: 'var(--text-disabled)' }} aria-label="Arrastar">
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {isCurrent && isPlaying ? (
        <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden relative flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="animate-waveform">
            <span /><span /><span />
          </div>
        </div>
      ) : (
        <button onClick={onPlay} className="w-10 h-10 rounded flex-shrink-0 overflow-hidden relative">
          {track.image ? (
            <img src={track.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <Music className="w-4 h-4" style={{ color: 'var(--text-disabled)' }} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-4 h-4 text-white" fill="white" />
          </div>
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${isCurrent ? 'font-semibold' : ''}`} style={{ color: isCurrent ? 'var(--accent-from)' : 'var(--text-primary)' }}>
          {track.name}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{track.artist_name}</p>
        <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{formatDuration(Math.floor(track.duration))}</p>
      </div>

      <button onClick={onRemove} className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-disabled)' }} title="Remover da fila">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function NowPlaying() {
  const router = useRouter()
  const progressRef = useRef<HTMLDivElement>(null)
  const [dominantColor, setDominantColor] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showQueueOnMobile, setShowQueueOnMobile] = useState(false)
  const [isFav, setIsFav] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  const {
    currentTrack, isPlaying, volume, progress, duration, queue,
    repeat, shuffle,
    togglePlay, next, prev,
    setVolume, setProgress, setDuration,
    setRepeat, toggleShuffle,
    removeFromQueue, reorderQueue, clearQueue,
  } = usePlayerStore()

  useEffect(() => {
    if (!currentTrack?.image) {
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = currentTrack.image
    img.onload = () => {
      fac.getColorAsync(img, { mode: 'precision', algorithm: 'dominant' })
        .then((c) => setDominantColor(c.hex))
        .catch(() => {})
    }
    img.onerror = () => {}
  }, [currentTrack?.id, currentTrack?.image])

  useEffect(() => {
    const audio = getAudioEl()
    if (!audio) return

    const onTimeUpdate = () => {
      if (!isDragging) setProgress(audio.currentTime)
    }
    const onLoadedMetadata = () => setDuration(audio.duration)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
  }, [isDragging, setProgress, setDuration])

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
    if (!user || !currentTrack) return
    supabase
      .from('favorites')
      .select('id')
      .eq('track_id', currentTrack.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsFav(!!data))
  }, [user, currentTrack?.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.back()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  if (!currentTrack) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Nenhuma faixa em reprodução</p>
      </div>
    )
  }

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0

  function handleProgressClick(e: React.MouseEvent) {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect) return
    const audio = getAudioEl()
    if (!audio) return
    const x = (e.clientX - rect.left) / rect.width
    const newTime = x * duration
    audio.currentTime = newTime
    setProgress(newTime)
  }

  function handleProgressDrag(e: React.MouseEvent) {
    if (!isDragging) return
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect) return
    const audio = getAudioEl()
    if (!audio) return
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = x * duration
    audio.currentTime = newTime
    setProgress(newTime)
  }

  const bgGradient = dominantColor
    ? `radial-gradient(ellipse at 30% 20%, ${dominantColor}66 0%, #0A0908 60%)`
    : 'linear-gradient(135deg, #FF6A0015, #0A0908)'

  const coverShadow = dominantColor
    ? `0 32px 64px ${dominantColor}4D`
    : '0 32px 64px rgba(0,0,0,0.5)'

  async function handleFavorite() {
    if (!user || !currentTrack) return
    if (isFav) {
      await supabase.from('favorites').delete().eq('track_id', currentTrack.id).eq('user_id', user.id)
      setIsFav(false)
    } else {
      await supabase.from('favorites').insert({
        user_id: user.id,
        track_id: currentTrack.id,
        track_data: currentTrack as unknown as Json,
      })
      setIsFav(true)
    }
  }

  const RepeatIcon = repeat === 'one' ? Repeat1 : repeat === 'all' ? Repeat : null
  const repeatLabel: Record<RepeatMode, string> = { none: 'Sem repeat', one: 'Repeat 1', all: 'Repeat tudo' }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragEnd(event: { active: { id: string | number }; over: { id: string | number } | null }) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = parseInt(String(active.id).split('-')[0], 10)
    const toIndex = parseInt(String(over.id).split('-')[0], 10)
    reorderQueue(fromIndex, toIndex)
  }

  function playTrackAt(queueIndex: number) {
    const track = queue[queueIndex]
    if (!track) return
    const store = usePlayerStore.getState()
    store.play(track, store.originalQueue, store.currentPlaylistId ?? undefined, store.currentPlaylistName ?? undefined)
  }

  return (
    <div
      className="h-full flex flex-col animate-slide-up overflow-hidden"
      style={{ background: bgGradient, transition: 'background 800ms ease' }}
    >
      <header className="flex items-center justify-between px-4 md:px-6 h-14 flex-none">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-white/[0.06] transition-colors" style={{ color: 'var(--text-primary)' }} aria-label="Fechar">
          <ChevronDown className="w-6 h-6" />
        </button>
        <button
          onClick={() => setShowQueueOnMobile(!showQueueOnMobile)}
          className="md:hidden p-2 rounded-full hover:bg-white/[0.06] transition-colors"
          style={{ color: showQueueOnMobile ? 'var(--accent-from)' : 'var(--text-secondary)' }}
          aria-label="Fila"
        >
          <Music className="w-5 h-5" />
        </button>
        <div className="hidden md:block" />
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-0 min-h-0 px-4 md:px-6 pb-4">
        <div className={`flex-1 flex flex-col items-center justify-start gap-3 min-h-0 overflow-hidden pt-2 md:pt-6 ${showQueueOnMobile ? 'hidden md:flex' : ''}`}>
          <div className="relative flex-shrink-0" style={{ width: 'min(320px, 50vw, 42vh)', aspectRatio: '1' }}>
            {currentTrack.image ? (
              <img
                src={currentTrack.image}
                alt={currentTrack.name}
                className="w-full h-full rounded-2xl object-cover"
                style={{ boxShadow: coverShadow }}
              />
            ) : (
              <div className="w-full h-full rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <Music className="w-16 h-16" style={{ color: 'var(--text-disabled)' }} />
              </div>
            )}
          </div>

          <div className="w-full max-w-[400px] text-center space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold truncate" style={{ color: 'var(--text-primary)' }} title={currentTrack.name}>
              {currentTrack.name}
            </h1>
            <Link
              href={`/artists/${currentTrack.artist_id}`}
              className="text-base inline-block hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              {currentTrack.artist_name}
            </Link>
          </div>

          <div className="flex items-center gap-4" style={{ color: 'var(--text-secondary)' }}>
            {user && (
              <button onClick={handleFavorite} className="p-2 transition-colors" aria-label="Favoritar">
                <svg
                  className="w-6 h-6 transition-colors duration-150"
                  fill={isFav ? 'url(#favGradientNow)' : 'none'}
                  viewBox="0 0 24 24"
                  stroke={isFav ? 'none' : 'currentColor'}
                  strokeWidth={2}
                  style={isFav ? {} : { color: 'var(--text-secondary)' }}
                >
                  <defs>
                    <linearGradient id="favGradientNow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent-from)" />
                      <stop offset="100%" stopColor="var(--accent-to)" />
                    </linearGradient>
                  </defs>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            )}
          </div>

          <div className="w-full max-w-[400px] space-y-1">
            <div
              ref={progressRef}
              className="w-full h-1 rounded-full cursor-pointer relative group hover:h-1.5 transition-all duration-200"
              style={{ backgroundColor: 'var(--text-disabled)' }}
              onClick={handleProgressClick}
              onMouseDown={() => setIsDragging(true)}
              onMouseMove={handleProgressDrag}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <div
                className="h-full rounded-full relative"
                style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, var(--accent-from), var(--accent-to))' }}
              >
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'var(--accent-to)' }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>{formatDuration(Math.floor(progress))}</span>
              <span>{formatDuration(Math.floor(duration))}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 md:gap-4 w-full max-w-[400px]">
            <button onClick={toggleShuffle} className="p-2 transition-colors" style={{ color: shuffle ? 'var(--accent-from)' : 'var(--text-secondary)' }} title={shuffle ? 'Desativar shuffle' : 'Ativar shuffle'}>
              <Shuffle className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button onClick={prev} className="p-2 transition-colors" style={{ color: 'var(--text-secondary)' }} title="Anterior">
              <SkipBack className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <button
              onClick={togglePlay}
              className="rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{ width: 48, height: 48, background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
              title={isPlaying ? 'Pausar' : 'Tocar'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--bg-base)' }} fill="currentColor" />
              ) : (
                <Play className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--bg-base)' }} fill="currentColor" />
              )}
            </button>

            <button onClick={next} className="p-2 transition-colors" style={{ color: 'var(--text-secondary)' }} title="Próxima">
              <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <button
              onClick={() => {
                const modes: RepeatMode[] = ['none', 'all', 'one']
                const idx = modes.indexOf(repeat)
                setRepeat(modes[(idx + 1) % modes.length])
              }}
              className="p-2 transition-colors relative"
              style={{ color: repeat !== 'none' ? 'var(--accent-from)' : 'var(--text-secondary)' }}
              title={repeatLabel[repeat]}
            >
              {RepeatIcon ? (
                <RepeatIcon className="w-4 h-4 md:w-5 md:h-5" />
              ) : (
                <Repeat className="w-4 h-4 md:w-5 md:h-5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>
            {volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1 accent-[var(--accent-from)] cursor-pointer"
            />
          </div>
        </div>

        <div className={`w-full md:w-[320px] lg:w-[380px] flex flex-col flex-none min-h-0 ${showQueueOnMobile ? '' : 'hidden md:flex'}`}>
          <div className="flex-none px-2 py-2">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>A seguir</h2>
            {usePlayerStore.getState().currentPlaylistName && (
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{usePlayerStore.getState().currentPlaylistName}</p>
            )}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={queue.map((_, i) => `${i}-${queue[i].id}`)} strategy={verticalListSortingStrategy}>
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin px-1 space-y-0.5">
                {queue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <Music className="w-10 h-10 mb-3" style={{ color: 'var(--text-disabled)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nenhuma faixa na fila</p>
                  </div>
                ) : (
                  queue.map((track, index) => (
                    <SortableQueueItem
                      key={`${index}-${track.id}`}
                      track={track}
                      index={index}
                      isCurrent={track.id === currentTrack.id}
                      isPlaying={isPlaying}
                      onPlay={() => playTrackAt(index)}
                      onRemove={() => removeFromQueue(index)}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex-none flex items-center gap-2 px-2 py-3 border-t border-white/5">
            <button
              onClick={() => clearQueue()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar fila
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
