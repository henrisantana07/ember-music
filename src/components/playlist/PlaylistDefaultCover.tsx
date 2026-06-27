'use client'

import { Music } from 'lucide-react'

interface Props {
  size?: number
  className?: string
}

export function PlaylistDefaultCover({ size = 160, className }: Props) {
  const iconSize = size * 0.4

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #FF6A00, #FFC400)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Music size={iconSize} color="#0A0908" strokeWidth={1.5} />
    </div>
  )
}
