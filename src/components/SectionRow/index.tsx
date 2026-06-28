'use client'

import type { Track } from '@/types/music'
import { TrackCard } from '@/components/TrackCard'
import { Carousel } from '@/components/Carousel'
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
        {tracks.map((track) => (
          <div key={track.id} className="w-44 flex-shrink-0">
            <TrackCard track={track} tracks={tracks} user={user} />
          </div>
        ))}
      </Carousel>
    </section>
  )
}
