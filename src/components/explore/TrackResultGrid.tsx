'use client'

import { useEffect, useState } from 'react'
import type { Track } from '@/types/music'
import { createClient } from '@/lib/supabase/client'
import { TrackCard } from '@/components/TrackCard'
import { CATALOG_GRID } from '@/components/ui/grid'

interface TrackResultGridProps {
  tracks: Track[]
  maxItems?: number
}

export function TrackResultGrid({ tracks, maxItems }: TrackResultGridProps) {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const displayTracks = maxItems ? tracks.slice(0, maxItems) : tracks
  if (displayTracks.length === 0) return null

  return (
    <div className={CATALOG_GRID}>
      {displayTracks.map((track) => (
        <TrackCard key={track.id} track={track} tracks={tracks} user={user} />
      ))}
    </div>
  )
}
