'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export interface FollowedArtist {
  artist_id: string
  artist_data: { id: string; name: string; image: string } | null
  followed_at: string
}

interface ArtistsState {
  artists: FollowedArtist[]
  loading: boolean
  fetchArtists: () => Promise<void>
  addArtist: (artist: FollowedArtist) => void
  removeArtist: (artistId: string) => void
}

export const useArtistsStore = create<ArtistsState>((set) => ({
  artists: [],
  loading: false,

  fetchArtists: async () => {
    set({ loading: true })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      set({ artists: [], loading: false })
      return
    }
    const { data } = await supabase
      .from('followed_artists')
      .select('*')
      .eq('user_id', user.id)
      .order('followed_at', { ascending: false })
    if (data) set({ artists: data as unknown as FollowedArtist[] })
    set({ loading: false })
  },

  addArtist: (artist) =>
    set((s) => ({ artists: [artist, ...s.artists] })),

  removeArtist: (artistId) =>
    set((s) => ({ artists: s.artists.filter((a) => a.artist_id !== artistId) })),
}))
