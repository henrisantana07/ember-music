'use client'

import { useState } from 'react'
import { YouTubePlayer } from '@/components/YouTubePlayer'

interface YouTubeResultItem {
  videoId: string
  title: string
  channelTitle: string
  description: string
  thumbnails: Record<string, { url: string; width: number; height: number }>
  publishedAt: string
}

interface YouTubeResultProps {
  items: YouTubeResultItem[]
  query: string
}

export function YouTubeResult({ items, query }: YouTubeResultProps) {
  const [playingVideo, setPlayingVideo] = useState<YouTubeResultItem | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (items.length === 0) return null

  return (
    <>
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => (
            <button
              key={item.videoId}
              onClick={() => setPlayingVideo(item)}
              onMouseEnter={() => setHoveredId(item.videoId)}
              onMouseLeave={() => setHoveredId(null)}
              className="group text-left rounded-lg overflow-hidden transition-colors"
              style={{ backgroundColor: 'transparent' }}
            >
              <div className="relative aspect-square rounded-md overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <img
                  src={item.thumbnails?.medium?.url ?? item.thumbnails?.default?.url ?? ''}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div
                  className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    opacity: hoveredId === item.videoId ? 1 : 0,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                      transform: hoveredId === item.videoId ? 'scale(1)' : 'scale(0.9)',
                    }}
                  >
                    <svg className="w-6 h-6 ml-0.5" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <span
                  className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'var(--accent-solid)' }}
                >
                  YT
                </span>
              </div>
              <div className="mt-2 px-0.5">
                <p className="text-sm font-semibold truncate">{item.title}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {item.channelTitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <YouTubePlayer
        videoId={playingVideo?.videoId ?? ''}
        title={playingVideo?.title ?? ''}
        channelTitle={playingVideo?.channelTitle ?? ''}
        open={!!playingVideo}
        onClose={() => setPlayingVideo(null)}
      />
    </>
  )
}
