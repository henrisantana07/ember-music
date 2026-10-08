'use client'

import { useCallback } from 'react'
import { usePlayerStore } from '@/lib/store'
import { useLocalLibrary } from '@/features/local-library/hooks/use-local-library'
import { localTrackToPlayerTrack, localTracksToPlayerTracks } from '@/features/local-library/lib/local-audio'
import type { LocalMusicFile } from '@/features/local-library/types'

export function useLocalPlayer() {
  const { play, pause, resume, togglePlay, next, prev, queue, currentTrack, isPlaying } = usePlayerStore()
  const { folders, getFilteredTracks, getTracksByFolder, getTracksByArtist, getTracksByAlbum } = useLocalLibrary()

  const playTrack = useCallback(
    async (track: LocalMusicFile, contextTracks?: LocalMusicFile[]) => {
      const tracksToPlay = contextTracks || getFilteredTracks()
      const [playerTracks, playerTrack] = await Promise.all([
        localTracksToPlayerTracks(tracksToPlay, folders),
        localTrackToPlayerTrack(track, folders),
      ])
      play(playerTrack, playerTracks)
    },
    [play, getFilteredTracks, folders]
  )

  const playFolder = useCallback(
    async (folderId: string) => {
      const tracks = getTracksByFolder(folderId)
      if (tracks.length === 0) return
      const playerTracks = await localTracksToPlayerTracks(tracks, folders)
      play(playerTracks[0], playerTracks)
    },
    [play, getTracksByFolder, folders]
  )

  const playArtist = useCallback(
    async (artist: string) => {
      const tracks = getTracksByArtist(artist)
      if (tracks.length === 0) return
      const playerTracks = await localTracksToPlayerTracks(tracks, folders)
      play(playerTracks[0], playerTracks)
    },
    [play, getTracksByArtist, folders]
  )

  const playAlbum = useCallback(
    async (album: string, artist: string) => {
      const tracks = getTracksByAlbum(album, artist)
      if (tracks.length === 0) return
      const playerTracks = await localTracksToPlayerTracks(tracks, folders)
      play(playerTracks[0], playerTracks)
    },
    [play, getTracksByAlbum, folders]
  )

  const playAll = useCallback(async () => {
    const tracks = getFilteredTracks()
    if (tracks.length === 0) return
    const playerTracks = await localTracksToPlayerTracks(tracks, folders)
    play(playerTracks[0], playerTracks)
  }, [play, getFilteredTracks, folders])

  return {
    playTrack,
    playFolder,
    playArtist,
    playAlbum,
    playAll,
    pause,
    resume,
    togglePlay,
    next,
    prev,
    queue,
    currentTrack,
    isPlaying,
  }
}