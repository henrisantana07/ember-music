'use client'

import { useCallback } from 'react'
import { usePlayerStore } from '@/lib/store'
import { playerAudioRef } from '@/lib/player-audio'
import { useYouTube } from '@/components/YouTubePlayer/context'

/**
 * Handlers de transporte compartilhados entre o rodapé e a hero. A lógica de
 * áudio/YouTube fica num só lugar: os dois componentes apenas chamam as mesmas
 * funções sobre a store real.
 */
export function useTrackSeek() {
  const yt = useYouTube()
  return useCallback((seconds: number) => {
    const track = usePlayerStore.getState().currentTrack
    if (track?.source === 'youtube' && track.youtubeVideoId) {
      yt.seek(seconds)
    } else if (playerAudioRef.current) {
      playerAudioRef.current.currentTime = seconds
      usePlayerStore.getState().setProgress(seconds)
    }
  }, [yt])
}

export function useTrackPrev() {
  const yt = useYouTube()
  const seek = useTrackSeek()
  return useCallback(() => {
    const currentTime = yt.getCurrentTime() || playerAudioRef.current?.currentTime || 0
    if (currentTime > 3) {
      seek(0)
    } else {
      usePlayerStore.getState().prev()
    }
  }, [yt, seek])
}
