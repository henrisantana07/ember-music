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
        background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Music size={iconSize} color="var(--bg-base)" strokeWidth={1.5} />
    </div>
  )
}
