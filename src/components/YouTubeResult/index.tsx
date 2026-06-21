'use client'

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
  if (items.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-1">YouTube</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        Resultados para &ldquo;{query}&rdquo; &mdash; clique para ouvir completo no YouTube
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item) => (
          <a
            key={item.videoId}
            href={`https://youtube.com/watch?v=${item.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <img
              src={item.thumbnails?.medium?.url ?? item.thumbnails?.default?.url ?? ''}
              alt={item.title}
              className="w-24 h-auto rounded-md object-cover flex-shrink-0"
              loading="lazy"
            />
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
          </a>
        ))}
      </div>
    </section>
  )
}
