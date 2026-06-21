'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export interface PlaylistItem {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  user_id: string
  created_at: string | null
  track_count: number
}

interface PlaylistsState {
  playlists: PlaylistItem[]
  loading: boolean
  fetchPlaylists: () => Promise<void>
  addPlaylist: (playlist: PlaylistItem) => void
  removePlaylist: (id: string) => void
  updatePlaylist: (id: string, data: Partial<PlaylistItem>) => void
}

export const usePlaylistsStore = create<PlaylistsState>((set) => ({
  playlists: [],
  loading: false,

  fetchPlaylists: async () => {
    set({ loading: true })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      set({ playlists: [], loading: false })
      return
    }
    const { data } = await supabase
      .from('playlists')
      .select('*, playlist_tracks(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      const mapped = data.map((p: any) => ({
        ...p,
        track_count: p.playlist_tracks?.[0]?.count ?? 0,
      }))
      set({ playlists: mapped })
    }
    set({ loading: false })
  },

  addPlaylist: (playlist) =>
    set((s) => ({ playlists: [playlist, ...s.playlists] })),

  removePlaylist: (id) =>
    set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),

  updatePlaylist: (id, data) =>
    set((s) => ({
      playlists: s.playlists.map((p) => (p.id === id ? { ...p, ...data } : p)),
    })),
}))
