'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Track } from '@/types/music'
import { usePlayerStore } from '@/lib/store'
import { formatDuration } from '@/lib/spotify'
import { useEnsureFavorites, useFavoritesStore, useFavoritesSync, useIsFavorite } from '@/lib/favorites-store'
import { PlaylistModal } from '@/components/PlaylistModal'
import { Skeleton } from '@/components/Skeleton'
import { IconButton } from '@/components/ui/IconButton'
import { EmptyState } from '@/components/ui/states'
import { MenuPanel, MenuItem, useMenu } from '@/components/ui/Menu'

export type TrackSortKey = 'default' | 'title' | 'album' | 'duration' | 'date'

export interface TrackTableProps {
  tracks: Track[]
  /** Any object with an id is enough (Supabase User or a slim session user). */
  user?: { id: string } | null
  /** Friendly date per track id for the "Adicionada em" column. */
  dates?: Record<string, string>
  /** Extra column content (audio quality / explicit markers). */
  badges?: (track: Track) => ReactNode
  sort?: TrackSortKey
  sortDir?: 'asc' | 'desc'
  /** Enables sortable column headers (aria-sort + callback). */
  onSort?: (key: TrackSortKey) => void
  loading?: boolean
  empty?: { title: string; description?: string; action?: { label: string; onClick: () => void } }
  className?: string
}

function FavoriteButton({ track, user }: { track: Track; user?: { id: string } | null }) {
  const isFav = useIsFavorite(track.id)
  const toggle = useFavoritesStore((s) => s.toggle)
  if (!user) return null

  return (
    <IconButton
      size="sm"
      label={isFav ? `Remover ${track.name} dos favoritos` : `Adicionar ${track.name} aos favoritos`}
      aria-pressed={isFav}
      onClick={(e) => { e.stopPropagation(); void toggle(track) }}
    >
      <svg
        className="w-4 h-4"
        fill={isFav ? `url(#favTb${track.id.replace(/[^a-zA-Z0-9]/g, '')})` : 'none'}
        viewBox="0 0 24 24"
        stroke={isFav ? 'none' : 'currentColor'}
        strokeWidth={2}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`favTb${track.id.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-from)" />
            <stop offset="100%" stopColor="var(--accent-to)" />
          </linearGradient>
        </defs>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </IconButton>
  )
}

function RowMenu({ track }: { track: Track }) {
  const menu = useMenu()
  const [playlistOpen, setPlaylistOpen] = useState(false)

  return (
    <>
      <IconButton
        size="sm"
        label={`Mais opções para ${track.name}`}
        {...menu.triggerProps}
        onClick={(e) => { e.stopPropagation(); menu.toggle() }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </IconButton>
      {menu.open && (
        <MenuPanel {...menu.panelProps} onClick={(e) => e.stopPropagation()}>
          <MenuItem onClick={() => { setPlaylistOpen(true); menu.close() }}>Adicionar à playlist</MenuItem>
        </MenuPanel>
      )}
      <PlaylistModal open={playlistOpen} onClose={() => setPlaylistOpen(false)} track={track} />
    </>
  )
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className = '',
}: {
  label: string
  sortKey: TrackSortKey
  current?: TrackSortKey
  dir?: 'asc' | 'desc'
  onSort?: (key: TrackSortKey) => void
  className?: string
}) {
  const active = current === sortKey
  const ariaSort: 'ascending' | 'descending' | 'none' = active ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'

  if (!onSort) {
    return <th scope="col" className={`py-2 text-left text-label-medium font-semibold uppercase tracking-wider ${className}`} style={{ color: 'var(--text-disabled)' }}>{label}</th>
  }

  return (
    <th scope="col" aria-sort={ariaSort} className={`py-2 text-left ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-label-medium font-semibold uppercase tracking-wider transition-colors state-layer rounded px-1 py-0.5 ${active ? 'text-[var(--accent-solid)]' : 'text-[var(--text-disabled)] hover:text-[var(--text-primary)]'}`}
      >
        {label}
        <svg className={`w-3 h-3 transition-transform ${active && dir === 'desc' ? 'rotate-180' : ''} ${active ? 'opacity-100' : 'opacity-30'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </th>
  )
}

function PlayingIndicator({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <span className="animate-waveform justify-center w-4" aria-hidden="true">
        <span /><span /><span />
      </span>
    )
  }
  return (
    <span className="inline-flex w-4 justify-center" aria-hidden="true">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
    </span>
  )
}

export function TrackTable({
  tracks,
  user,
  dates,
  badges,
  sort = 'default',
  sortDir = 'asc',
  onSort,
  loading,
  empty,
  className = '',
}: TrackTableProps) {
  const { play, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  useFavoritesSync(user?.id)
  useEnsureFavorites(tracks.map((t) => t.id))

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`} aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2">
            <Skeleton width={20} height={14} />
            <Skeleton width={48} height={48} borderRadius="var(--shape-small)" />
            <div className="flex-1 space-y-2"><Skeleton width="60%" height={12} /><Skeleton width="40%" height={10} /></div>
            <Skeleton width={48} height={12} />
          </div>
        ))}
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? 'Nenhuma faixa por aqui'}
        description={empty?.description}
        action={empty?.action}
      />
    )
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-body-medium">
        <caption className="sr-only">Faixas</caption>
        <thead>
          <tr className="border-b border-outline-variant">
            <th scope="col" className="py-2 pr-3 w-10 text-right text-label-medium font-semibold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
              Nº
            </th>
            <th scope="col" className="py-2 text-left text-label-medium font-semibold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
              Título
            </th>
            <SortHeader label="Álbum" sortKey="album" current={sort} dir={sortDir} onSort={onSort} className="hidden md:table-cell" />
            <SortHeader label="Adicionada em" sortKey="date" current={sort} dir={sortDir} onSort={onSort} className="hidden lg:table-cell" />
            <th scope="col" className="py-2 w-24 text-left text-label-medium font-semibold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
              Ações
            </th>
            <SortHeader label="Duração" sortKey="duration" current={sort} dir={sortDir} onSort={onSort} className="text-right" />
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, index) => {
            const isActive = currentTrack?.id === track.id
            const isPlayingThis = isActive && isPlaying
            const playToggle = (e?: React.SyntheticEvent) => {
              e?.stopPropagation()
              if (isActive) togglePlay()
              else play(track, tracks)
            }

            return (
              <tr
                key={`${track.id}-${index}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => playToggle()}
                className={`group cursor-pointer transition-colors border-b border-outline-variant/40 ${
                  isActive ? 'bg-[color-mix(in srgb, var(--accent-solid) 10%, transparent)]' : 'hover:bg-state-hover'
                }`}
              >
                {/* 01 — index / playback status */}
                <td className="text-right pr-3 py-2 w-10 align-middle">
                  <button
                    type="button"
                    onClick={playToggle}
                    aria-label={isActive ? `Pausar ${track.name}` : `Tocar ${track.name}`}
                    className="inline-flex h-5 w-5 items-center justify-center text-label-medium"
                    style={{ color: isActive ? 'var(--accent-solid)' : 'var(--text-disabled)' }}
                  >
                    {isActive ? (
                      <PlayingIndicator playing={isPlayingThis} />
                    ) : (
                      <>
                        <span className="group-hover:hidden">{index + 1}</span>
                        <svg className="hidden group-hover:block" style={{ color: 'var(--accent-solid)' }} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                      </>
                    )}
                  </button>
                </td>

                {/* 02 — media + title + artist */}
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={track.image} alt="" className="w-12 h-12 rounded-[var(--shape-small)] object-cover flex-shrink-0" loading="lazy" />
                    <div className="min-w-0">
                      <p className={`truncate font-semibold ${isActive ? 'text-[var(--accent-solid)]' : 'text-[var(--text-primary)]'}`}>{track.name}</p>
                      <p className="truncate text-body-small" style={{ color: 'var(--text-secondary)' }}>{track.artist_name}</p>
                    </div>
                  </div>
                </td>

                {/* 03 — album */}
                <td className="py-2 pr-3 hidden md:table-cell max-w-[180px] truncate" style={{ color: 'var(--text-secondary)' }}>
                  {track.album_name}
                </td>

                {/* 04 — added date */}
                <td className="py-2 pr-3 hidden lg:table-cell whitespace-nowrap text-body-small" style={{ color: 'var(--text-secondary)' }}>
                  {dates?.[track.id] ?? '—'}
                </td>

                {/* 05 — quick actions (always visible) */}
                <td className="py-2">
                  <div className="flex items-center gap-0.5">
                    <FavoriteButton track={track} user={user} />
                    <RowMenu track={track} />
                  </div>
                </td>

                {/* 06 — duration + quality */}
                <td className="py-2 text-right whitespace-nowrap" style={{ color: 'var(--text-disabled)' }}>
                  <span className="inline-flex items-center gap-2">
                    {badges?.(track)}
                    {formatDuration(track.duration)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
