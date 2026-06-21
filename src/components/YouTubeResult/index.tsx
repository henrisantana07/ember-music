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

  if (items.length === 0) return null

  return (
    <>
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-1">YouTube</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Resultados para &ldquo;{query}&rdquo; &mdash; clique para ouvir
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((item) => (
            <button
              key={item.videoId}
              onClick={() => setPlayingVideo(item)}
              className="flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={item.thumbnails?.medium?.url ?? item.thumbnails?.default?.url ?? ''}
                  alt={item.title}
                  className="w-24 h-auto rounded-md object-cover"
                  loading="lazy"
                />
                <div
                  className="absolute inset-0 rounded-md flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.5)' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                  >
                    <svg className="w-5 h-5" style={{ color: 'var(--bg-base)' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold line-clamp-2">{item.title}</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {item.channelTitle}
                </p>
                <span
                  className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded"
                  style={{ background: 'var(--accent-muted)', color: 'var(--accent-solid)' }}
                >
                  YouTube
                </span>
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
