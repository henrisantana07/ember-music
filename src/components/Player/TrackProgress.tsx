'use client'

import { useRef, useState } from 'react'
import { usePlayerStore } from '@/lib/store'
import { useYouTubeTime } from '@/components/YouTubePlayer/context'
import { formatDuration } from '@/lib/spotify'
import { useTrackSeek } from '@/hooks/use-player-transport'

/**
 * Uma única barra de progresso, usada pelo rodapé e pela hero. O arraste,
 * o teclado e o seek ao vivo são idênticos nos dois lugares — o que muda é só
 * o comprimento do recipiente. Nenhum estado de reprodução é duplicado: tudo
 * vem da store e do mesmo elemento `<audio>`.
 */
export function TrackProgress({ className = '' }: { className?: string }) {
  const progressRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [seekPreview, setSeekPreview] = useState<number | null>(null)

  const rawProgress = usePlayerStore((s) => s.progress)
  const rawDuration = usePlayerStore((s) => s.duration)
  const track = usePlayerStore((s) => s.currentTrack)
  const isYouTubeTrack = track?.source === 'youtube' && !!track.youtubeVideoId
  const { currentTime: ytCurrentTime, duration: ytDuration } = useYouTubeTime()
  const seek = useTrackSeek()

  const currentDuration = isYouTubeTrack ? (ytDuration || rawDuration) : rawDuration
  const liveProgress = isYouTubeTrack ? (ytCurrentTime || rawProgress) : rawProgress
  const currentProgress = isDragging && seekPreview !== null ? seekPreview : liveProgress
  const progressPercent = currentDuration > 0 ? (currentProgress / currentDuration) * 100 : 0

  function progressTimeFromClientX(clientX: number) {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
    return ratio * currentDuration
  }

  function beginProgressDrag(clientX: number) {
    isDraggingRef.current = true
    setIsDragging(true)
    setSeekPreview(progressTimeFromClientX(clientX))
  }

  // `clientX === null` = gesto interrompido: solta sem buscar, para não pular
  // a faixa quando o sistema roubar o toque.
  function endProgressDrag(clientX: number | null) {
    isDraggingRef.current = false
    setIsDragging(false)
    setSeekPreview(null)
    if (clientX !== null) seek(progressTimeFromClientX(clientX))
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    progressRef.current?.setPointerCapture(e.pointerId)
    beginProgressDrag(e.clientX)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    setSeekPreview(progressTimeFromClientX(e.clientX))
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    if (progressRef.current?.hasPointerCapture(e.pointerId)) {
      progressRef.current.releasePointerCapture(e.pointerId)
    }
    endProgressDrag(e.clientX)
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    if (progressRef.current?.hasPointerCapture(e.pointerId)) {
      progressRef.current.releasePointerCapture(e.pointerId)
    }
    endProgressDrag(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 15 : 5
    let target: number
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') target = currentProgress + step
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') target = currentProgress - step
    else if (e.key === 'Home') target = 0
    else if (e.key === 'End') target = currentDuration
    else return
    e.preventDefault()
    seek(Math.min(Math.max(target, 0), currentDuration))
  }

  return (
    <div className={`flex w-full max-w-[560px] items-center gap-2 text-label-medium ${className}`} style={{ color: 'var(--text-disabled)' }}>
      <span className="w-8 text-right">{formatDuration(Math.floor(currentProgress))}</span>
      <div ref={progressRef}
        role="slider"
        tabIndex={0}
        aria-label="Progresso da faixa"
        aria-valuemin={0}
        aria-valuemax={Math.max(1, Math.round(currentDuration))}
        aria-valuenow={Math.round(currentProgress)}
        aria-valuetext={`${formatDuration(Math.floor(currentProgress))} de ${formatDuration(Math.floor(currentDuration))}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        className={`group relative flex h-4 flex-1 touch-none items-center ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}>
        {/* Trilha de 12px: alvo de clique estável; crescer a faixa não desloca nada. */}
        <div className={`h-1 w-full rounded-full transition-[height] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] ${isDragging ? 'h-2' : 'group-hover:h-2 group-focus-visible:h-2'}`}
          style={{ backgroundColor: 'var(--text-disabled)' }}>
          <div className="h-full rounded-full"
            style={{ width: `${progressPercent}%`, background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }} />
        </div>
        <div aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full transition-[opacity,translate,scale] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] ${isDragging ? 'scale-100 opacity-100' : 'scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100'}`}
          style={{ left: `calc(${progressPercent}% - 6px)`, backgroundColor: 'var(--accent-from)' }} />
      </div>
      <span className="w-8 text-left">{formatDuration(Math.floor(currentDuration))}</span>
    </div>
  )
}
