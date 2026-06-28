'use client'

interface ArtistPhotoProps {
  imageUrl: string
  name: string
}

export function ArtistPhoto({ imageUrl, name }: ArtistPhotoProps) {
  return (
    <div className="relative shrink-0">
      <svg width={208} height={208} className="absolute -inset-1" viewBox="0 0 208 208" fill="none">
        <defs>
          <linearGradient id="photo-border" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-from)" />
            <stop offset="100%" stopColor="var(--accent-to)" />
          </linearGradient>
        </defs>
        <circle cx="104" cy="104" r="102" stroke="url(#photo-border)" strokeWidth="4" />
      </svg>
      <img
        src={imageUrl}
        alt={name}
        className="w-[200px] h-[200px] rounded-full object-cover shadow-lg"
      />
    </div>
  )
}
