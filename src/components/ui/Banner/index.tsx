'use client'

interface BannerProps {
  title: string
  subtitle?: string
  description?: string
  image?: string
  gradient?: string
  ctaLabel?: string
  onCtaClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

export function Banner({
  title,
  subtitle,
  description,
  image,
  gradient = 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
  ctaLabel,
  onCtaClick,
  size = 'md',
}: BannerProps) {
  const heights: Record<string, string> = {
    sm: 'h-40 md:h-48',
    md: 'h-48 md:h-64',
    lg: 'h-56 md:h-80',
  }

  return (
    <section
      className={`relative rounded-xl overflow-hidden ${heights[size]} flex items-end animate-fade-in`}
      role="region"
      aria-label={title}
      style={{
        background: image
          ? `url(${image}) center/cover no-repeat`
          : gradient,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
        }}
      />

      <div className="relative z-10 p-4 md:p-6 w-full flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          {subtitle && (
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--accent-to)' }}>
              {subtitle}
            </p>
          )}
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold truncate">{title}</h2>
          {description && (
            <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          )}
        </div>

        {ctaLabel && (
          <button
            onClick={onCtaClick}
            className="btn-primary flex-shrink-0 text-sm whitespace-nowrap"
          >
            {ctaLabel}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </section>
  )
}
