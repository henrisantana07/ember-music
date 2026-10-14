'use client'

import type { Track } from '@/types/music'
import { formatDuration } from '@/lib/spotify'
import { usePlayerStore } from '@/lib/store'
import { useEnsureFavorites, useFavoritesStore, useFavoritesSync, useIsFavorite } from '@/lib/favorites-store'
import { useState } from 'react'
import { motion } from 'motion/react'
import { confirmPopProps, cardVariants, whileTap, TRANSITION } from '@/lib/motion'
import { useConfirmAnimation } from '@/lib/motion-hooks'
import { PlaylistModal } from '@/components/PlaylistModal'
import { IconButton } from '@/components/ui/IconButton'
import { CoverImage } from '@/components/ui/CoverImage'
import { cleanDisplayTitle } from '@/lib/clean-title'

interface TrackCardProps {
  track: Track
  tracks?: Track[]
  /** Any object with an id is enough (Supabase User or a slim session user). */
  user?: { id: string } | null
  /**
   * Position in the list, for the cascade entry. Leave it out when an ancestor
   * already owns the entrance — a carousel slot, say — since two fades on the
   * same pixels would multiply into one.
   */
  index?: number
}

export function TrackCard({ track, tracks, user, index }: TrackCardProps) {
  const { play, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const isFav = useIsFavorite(track.id)
  const toggleFavorite = useFavoritesStore((s) => s.toggle)
  const favId = `favTc${track.id.replace(/[^a-zA-Z0-9]/g, '')}`
  const confirmFavorite = useConfirmAnimation()

  const isActive = currentTrack?.id === track.id
  const isPlayingThis = isActive && isPlaying
  useFavoritesSync(user?.id)
  useEnsureFavorites([track.id])

  async function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) return
    // Before the await: the pop has to start on the click, not when the
    // round-trip to Supabase comes back.
    if (!isFav) confirmFavorite.play()
    await toggleFavorite(track)
  }

  function handlePlay() {
    if (isActive) {
      togglePlay()
    } else {
      play(track, tracks)
    }
  }

  return (
    <>
      <motion.div
        className="card-hover group p-4 cursor-pointer flex flex-col"
        style={{ borderRadius: 'var(--shape-extra-large)' }}
        onClick={handlePlay}
        variants={cardVariants}
        custom={index}
        initial={index === undefined ? false : 'hidden'}
        animate={index === undefined ? undefined : 'visible'}
      >
        <div className="relative mb-3">
          <CoverImage
            src={track.image}
            videoId={track.youtubeVideoId}
            alt=""
            className="w-full aspect-square rounded-[var(--shape-large)] object-cover"
          />
          <div
            className="absolute inset-0 rounded-[var(--shape-large)] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: 'var(--accent-overlay)' }}
            aria-hidden="true"
          />
          {/* Quick Play — always visible (M3 FAB), never hover-only */}
          <motion.button
            type="button"
            onClick={(e) => { e.stopPropagation(); handlePlay() }}
            aria-label={isPlayingThis ? `Pausar ${track.name}` : `Tocar ${track.name}`}
            aria-pressed={isPlayingThis}
            className="absolute bottom-3 right-3 w-14 h-14 rounded-full flex items-center justify-center shadow-elevation-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            whileHover={{ scale: 1.05 }}
            whileTap={whileTap}
            transition={TRANSITION.press}
            style={{
              background: isActive
                ? 'linear-gradient(135deg, var(--accent-from), var(--accent-to))'
                : 'var(--surface-container-highest)',
              color: isActive ? 'var(--bg-base)' : 'var(--accent-solid)',
              outlineColor: 'var(--accent-solid)',
            }}
          >
            {isPlayingThis ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </motion.button>
        </div>

        <h3
          className={`font-semibold text-title-medium truncate ${isActive ? 'text-[var(--accent-solid)]' : ''}`}
          title={track.name}
        >
          {cleanDisplayTitle(track.name, track.artist_name)}
        </h3>
        <p className="text-body-medium truncate mt-1" style={{ color: 'var(--text-secondary)' }}>
          {track.artist_name}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-body-medium" style={{ color: 'var(--text-disabled)' }}>
            {formatDuration(track.duration)}
          </span>
          <div className="flex items-center gap-1">
            {user && (
              <IconButton
                size="lg"
                label={`Adicionar ${track.name} à playlist`}
                onClick={(e) => { e.stopPropagation(); setPlaylistOpen(true) }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </IconButton>
            )}
            {user && (
              <IconButton
                size="lg"
                label={isFav ? `Remover ${track.name} dos favoritos` : `Adicionar ${track.name} aos favoritos`}
                aria-pressed={isFav}
                onClick={handleFavorite}
              >
                <motion.svg
                  {...confirmPopProps(confirmFavorite.controls)}
                  className="w-5 h-5"
                  fill={isFav ? `url(#${favId})` : 'none'}
                  viewBox="0 0 24 24"
                  stroke={isFav ? 'none' : 'currentColor'}
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={favId} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent-from)" />
                      <stop offset="100%" stopColor="var(--accent-to)" />
                    </linearGradient>
                  </defs>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </motion.svg>
              </IconButton>
            )}
          </div>
        </div>
      </motion.div>
      <PlaylistModal open={playlistOpen} onClose={() => setPlaylistOpen(false)} track={track} />
    </>
  )
}
