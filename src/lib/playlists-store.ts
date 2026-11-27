'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { CoverSource } from '@/lib/playlist/resolveCover'

export interface PlaylistItem {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  cover_source: CoverSource
  custom_cover_url: string | null
  last_track_cover_url: string | null
  user_id: string
  created_at: string | null
  updated_at: string | null
  track_count: number
  is_public: boolean
  collaborative: boolean | null
  share_token: string | null
}

interface PlaylistsState {
  playlists: PlaylistItem[]
  loading: boolean
  /** Evita refetch (e o skeleton da sidebar) quando os dados já estão na store. */
  loaded: boolean
  fetchPlaylists: (force?: boolean) => Promise<void>
  /** Limpa o cache quando a conta muda (logout/login de outro usuário). */
  reset: () => void
  addPlaylist: (playlist: PlaylistItem) => void
  removePlaylist: (id: string) => void
  updatePlaylist: (id: string, data: Partial<PlaylistItem>) => void
  updatePlaylistCover: (
    playlistId: string,
    cover: Partial<Pick<PlaylistItem, 'cover_source' | 'custom_cover_url' | 'last_track_cover_url'>>
  ) => void
}

export const usePlaylistsStore = create<PlaylistsState>((set, get) => ({
  playlists: [],
  loading: false,
  loaded: false,

  reset: () => set({ playlists: [], loading: false, loaded: false }),

  fetchPlaylists: async (force = false) => {
    /* A sidebar e a aba Playlists da biblioteca compartilham esta store.
       Sem o guard, trocar de filtro marcava loading de novo e a sidebar
       voltava a mostrar "Carregando biblioteca…" com dados já prontos. */
    if (get().loaded && !force) return
    set({ loading: true })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      set({ playlists: [], loading: false, loaded: false })
      return
    }
    const { data, error } = await supabase
      .from('playlists')
      .select('*, playlist_tracks(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[usePlaylistsStore.fetchPlaylists] erro RLS:', error)
      set({ loading: false })
      return
    }

    if (data) {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped = data.map((p: any) => ({
        ...p,
        track_count: p.playlist_tracks?.[0]?.count ?? 0,
      }))
      set({ playlists: mapped, loaded: true })
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

  updatePlaylistCover: (playlistId, cover) =>
    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === playlistId ? { ...p, ...cover } : p
      ),
    })),
}))
