'use client'

import { useCallback } from 'react'
import { usePlayerStore } from '@/lib/store'
import { useLocalLibrary } from '@/features/local-library/hooks/use-local-library'
import type { LocalMusicFile } from '@/features/local-library/types'

function localTrackToPlayerTrack(track: LocalMusicFile) {
  return {
    id: track.id,
    name: track.title,
    duration: Math.floor(track.duration || 0),
    artist_id: track.artist,
    artist_name: track.artist,
    album_id: track.album,
    album_name: track.album,
    image: track.artwork || '/placeholder.svg',
    audio: URL.createObjectURL(new Blob([], { type: 'audio/mpeg' })),
    url: '',
    localPath: track.path,
    localFile: track,
  } as const
}

export function useLocalPlayer() {
  const { play, pause, resume, togglePlay, next, prev, queue, currentTrack, isPlaying } = usePlayerStore()
  const { getFilteredTracks, getTracksByFolder, getTracksByArtist, getTracksByAlbum } = useLocalLibrary()

  const playTrack = useCallback(
    (track: LocalMusicFile, contextTracks?: LocalMusicFile[]) => {
      const tracksToPlay = contextTracks || getFilteredTracks()
      const playerTracks = tracksToPlay.map(localTrackToPlayerTrack)
      const playerTrack = localTrackToPlayerTrack(track)
      play(playerTrack, playerTracks)
    },
    [play, getFilteredTracks]
  )

  const playFolder = useCallback(
    (folderId: string) => {
      const tracks = getTracksByFolder(folderId)
      if (tracks.length === 0) return
      const playerTracks = tracks.map(localTrackToPlayerTrack)
      play(playerTracks[0], playerTracks)
    },
    [play, getTracksByFolder]
  )

  const playArtist = useCallback(
    (artist: string) => {
      const tracks = getTracksByArtist(artist)
      if (tracks.length === 0) return
      const playerTracks = tracks.map(localTrackToPlayerTrack)
      play(playerTracks[0], playerTracks)
    },
    [play, getTracksByArtist]
  )

  const playAlbum = useCallback(
    (album: string, artist: string) => {
      const tracks = getTracksByAlbum(album, artist)
      if (tracks.length === 0) return
      const playerTracks = tracks.map(localTrackToPlayerTrack)
      play(playerTracks[0], playerTracks)
    },
    [play, getTracksByAlbum]
  )

  const playAll = useCallback(() => {
    const tracks = getFilteredTracks()
    if (tracks.length === 0) return
    const playerTracks = tracks.map(localTrackToPlayerTrack)
    play(playerTracks[0], playerTracks)
  }, [play, getFilteredTracks])

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