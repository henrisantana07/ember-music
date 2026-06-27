'use client'

import { Camera, Music } from 'lucide-react'
import { resolveCover } from '@/lib/playlist/resolveCover'
import { PlaylistDefaultCover } from './PlaylistDefaultCover'
import type { CoverSource } from '@/lib/playlist/resolveCover'

interface Props {
  playlist: {
    cover_source: CoverSource
    custom_cover_url: string | null
    last_track_cover_url: string | null
    name?: string
  }
  size?: number
  className?: string
  onClick?: () => void
}

export function PlaylistCover({ playlist, size = 160, className, onClick }: Props) {
  const cover = resolveCover(playlist)

  const containerStyle: React.CSSProperties = {
    width: size || undefined,
    height: size || undefined,
    borderRadius: 8,
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
  }

  return (
    <div style={containerStyle} className={className} onClick={onClick}>
      {cover.source === 'branded' ? (
        size ? (
          <PlaylistDefaultCover size={size} />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #FF6A00, #FFC400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Music size={24} color="#0A0908" strokeWidth={1.5} />
          </div>
        )
      ) : (
        <img
          src={cover.url!}
          alt="Capa da playlist"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {onClick && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            background: 'rgba(0,0,0,0.4)',
            opacity: 0,
            transition: 'opacity 200ms',
            color: '#F5F1ED',
            fontSize: 12,
            fontWeight: 600,
          }}
          className="playlist-cover-hover-overlay"
        >
          <Camera size={size ? size * 0.2 : 32} color="#F5F1ED" />
          <span>Trocar capa</span>
        </div>
      )}
    </div>
  )
}
