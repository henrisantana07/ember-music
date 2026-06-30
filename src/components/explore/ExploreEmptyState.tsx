'use client'

import type { User } from '@supabase/supabase-js'
import { SearchHistory } from './SearchHistory'
import { ExploreTrending } from './ExploreTrending'
import { GenreGrid } from './GenreGrid'
import type { Track } from '@/types/music'

interface ExploreEmptyStateProps {
  user: User | null
  onSearch: (q: string) => void
  userTracks: Track[]
  userLabel: string
}

export function ExploreEmptyState({ user, onSearch, userTracks, userLabel }: ExploreEmptyStateProps) {
  return (
    <div
      className="mx-auto max-w-[1100px] px-8 space-y-10"
    >
      <SearchHistory user={user} onSearch={onSearch} />
      <ExploreTrending userLabel={userLabel} userTracks={userTracks} />
      <GenreGrid />
    </div>
  )
}
