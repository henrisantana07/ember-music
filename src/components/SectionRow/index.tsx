'use client'

import type { Track } from '@/types/music'
import { TrackCard } from '@/components/TrackCard'

interface SectionRowProps {
  title: string
  tracks: Track[]
}

export function SectionRow({ title, tracks }: SectionRowProps) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
        {tracks.map((track) => (
          <div key={track.id} className="w-44 flex-shrink-0">
            <TrackCard track={track} tracks={tracks} />
          </div>
        ))}
      </div>
    </section>
  )
}
