'use client'

interface TestimonialCardProps {
  quote: string
  authorName: string
  authorRole?: string
  avatarUrl?: string
  rating?: number
}

export function TestimonialCard({
  quote,
  authorName,
  authorRole,
  avatarUrl,
  rating,
}: TestimonialCardProps) {
  return (
    <blockquote
      className="rounded-xl p-4 md:p-5 flex flex-col gap-3 h-full"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {rating !== undefined && (
        <div className="flex gap-0.5" aria-label={`${rating} de 5 estrelas`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <svg
              key={i}
              className="w-4 h-4"
              fill={i < rating ? 'var(--accent-from)' : 'none'}
              viewBox="0 0 24 24"
              stroke={i < rating ? 'var(--accent-from)' : 'var(--text-disabled)'}
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          ))}
        </div>
      )}

      <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>
        &ldquo;{quote}&rdquo;
      </p>

      <div className="flex items-center gap-3 pt-1">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
          >
            {authorName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <cite className="text-sm font-semibold not-italic truncate block">{authorName}</cite>
          {authorRole && (
            <span className="text-xs truncate block" style={{ color: 'var(--text-disabled)' }}>
              {authorRole}
            </span>
          )}
        </div>
      </div>
    </blockquote>
  )
}
