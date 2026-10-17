'use client'

import type { Album } from '@/types/music'
import { Carousel, CarouselItem } from '@/components/Carousel'
import Link from 'next/link'

interface AlbumRowProps {
  title: string
  albums: Album[]
}

export function AlbumRow({ title, albums }: AlbumRowProps) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <Carousel>
        {albums.map((album, index) => (
          <CarouselItem key={album.id} index={index} className="w-52 flex-shrink-0">
            <Link
              href={`/albums/${album.id}`}
              className="block p-4 rounded-xl transition-colors hover:bg-state-hover group relative"
            >
              <div className="relative mb-3">
                <img
                  src={album.image || '/placeholder.svg'}
                  alt={album.name}
                  className="w-full aspect-square rounded-lg object-cover shadow-md"
                  loading="lazy"
                />
              </div>
              <p className="text-body-large font-medium truncate" title={album.name}>{album.name}</p>
              <p className="text-body-medium truncate" style={{ color: 'var(--text-secondary)' }}>{album.artist_name}</p>
              {album.release_date && (
                <p className="text-body-medium" style={{ color: 'var(--text-disabled)' }}>{album.release_date.slice(0, 4)}</p>
              )}
            </Link>
          </CarouselItem>
        ))}
      </Carousel>
    </section>
  )
}
