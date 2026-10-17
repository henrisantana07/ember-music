'use client'

import type { Artist } from '@/types/music'
import { Carousel, CarouselItem } from '@/components/Carousel'
import { FollowButton } from '@/components/FollowButton'
import Link from 'next/link'

interface ArtistRowProps {
  title: string
  artists: Artist[]
}

export function ArtistRow({ title, artists }: ArtistRowProps) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <Carousel>
        {artists.map((artist, index) => (
          <CarouselItem
            key={artist.id}
            index={index}
            className="w-52 flex-shrink-0 p-4 rounded-xl text-center transition-colors hover:bg-state-hover flex flex-col items-center"
          >
            <Link href={`/artists/${artist.id}`} className="w-full flex flex-col items-center">
              <img
                src={artist.image || '/placeholder.svg'}
                alt={artist.name}
                className="w-full aspect-square rounded-full object-cover mb-3"
                loading="lazy"
              />
              <p className="w-full text-body-large font-semibold truncate mb-3" title={artist.name}>{artist.name}</p>
            </Link>
            <FollowButton artistId={artist.id} artistData={{ id: artist.id, name: artist.name, image: artist.image }} />
          </CarouselItem>
        ))}
      </Carousel>
    </section>
  )
}
