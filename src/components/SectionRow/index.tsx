'use client'

import type { Track } from '@/types/music'
import { TrackCard } from '@/components/TrackCard'
import { Carousel, CarouselItem } from '@/components/Carousel'
import { useUser } from '@/hooks/use-user'

interface SectionRowProps {
  title: string
  tracks: Track[]
}

export function SectionRow({ title, tracks }: SectionRowProps) {
  const { user } = useUser()

  return (
    <section className="mb-12">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <Carousel>
        {tracks.map((track, index) => (
          <CarouselItem key={track.id} className="w-52 flex-shrink-0" index={index}>
            {/* The slot owns the entrance, so the card is left out of it —
                two fades on the same pixels would multiply into one. */}
            <TrackCard track={track} tracks={tracks} user={user} />
          </CarouselItem>
        ))}
      </Carousel>
    </section>
  )
}
