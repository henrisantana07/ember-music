'use client'

import type { Artist } from '@/types/music'
import { Carousel, CarouselItem } from '@/components/Carousel'
import { CoverImage } from '@/components/ui/CoverImage'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { Lottie } from '@/components/ui/LottieLazy'
import Link from 'next/link'

interface ArtistResultCarouselProps {
  artists: Artist[]
  loading?: boolean
  maxItems?: number
}

export function ArtistResultCarousel({ artists, loading, maxItems }: ArtistResultCarouselProps) {
  if (loading) {
    return <LoadingState title="Carregando artistas…" />
  }

  const displayArtists = maxItems ? artists.slice(0, maxItems) : artists
  if (displayArtists.length === 0) {
    // The one place an empty result still renders rather than stepping aside:
    // every other call site guards on length, so this is the artist tab after
    // a search that matched nobody. Nothing there to scroll is worth saying.
    return (
      <EmptyState
        icon={<Lottie name="record" loop className="h-full w-full" />}
        title="Nenhum artista encontrado"
        description="Tente outro termo ou explore as outras abas."
      />
    )
  }

  return (
    <Carousel>
      {displayArtists.map((artist, index) => (
        <CarouselItem key={artist.id} index={index} className="w-32 flex-shrink-0">
          <Link
            href={`/artists/${artist.id}`}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-2 transition-colors duration-200 group-hover:border-transparent" style={{ borderColor: 'var(--bg-elevated)' }}>
              <CoverImage src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
            </div>
            <p className="text-body-large font-semibold text-center truncate w-full">{artist.name}</p>
            <p className="text-body-medium text-center" style={{ color: 'var(--text-secondary)' }}>
              {artist.followers > 0 ? `${(artist.followers / 1000).toFixed(0)}K fãs` : 'Artista'}
            </p>
          </Link>
        </CarouselItem>
      ))}
    </Carousel>
  )
}
