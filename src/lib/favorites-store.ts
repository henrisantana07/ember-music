'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'
import type { Track } from '@/types/music'

const BATCH_SIZE = 100

/** Ids currently being fetched, so concurrent views don't query twice. */
const inFlight = new Set<string>()

interface FavoritesStore {
  userId: string | null
  /** Resolved favorite state per track id. Only ids that were queried/toggled exist here. */
  known: Record<string, boolean>
  /** Binds the store to a user. Ignores undefined/null (loading or signed out). */
  init: (userId: string | null | undefined) => void
  /** Fetches state for any track ids we don't know yet. */
  ensure: (trackIds: string[]) => Promise<void>
  /** Optimistic toggle with rollback. Resolves to the new state, or false when it failed/signed out. */
  toggle: (track: Track) => Promise<boolean>
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  userId: null,
  known: {},

  init: (userId) => {
    if (typeof userId !== 'string' || !userId) return
    if (get().userId === userId) return
    set({ userId, known: {} })
  },

  ensure: async (trackIds) => {
    const { userId, known } = get()
    if (!userId) return

    const missing = [...new Set(trackIds)].filter((id) => id && !(id in known) && !inFlight.has(id))
    if (missing.length === 0) return

    const supabase = createClient()

    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const chunk = missing.slice(i, i + BATCH_SIZE)
      chunk.forEach((id) => inFlight.add(id))
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('track_id')
          .eq('user_id', userId)
          .in('track_id', chunk)
        if (error) {
          chunk.forEach((id) => inFlight.delete(id))
          continue
        }
        const found = new Set((data ?? []).map((row) => row.track_id))
        set((state) => {
          const next = { ...state.known }
          chunk.forEach((id) => { next[id] = found.has(id) })
          return { known: next }
        })
      } finally {
        chunk.forEach((id) => inFlight.delete(id))
      }
    }
  },

  toggle: async (track) => {
    const { userId, known } = get()
    if (!userId) return false

    const next = !(known[track.id] ?? false)
    set({ known: { ...known, [track.id]: next } })

    const supabase = createClient()
    const result = next
      ? await supabase.from('favorites').insert({
          user_id: userId,
          track_id: track.id,
          track_data: track as unknown as Json,
        })
      : await supabase.from('favorites').delete().eq('track_id', track.id).eq('user_id', userId)

    const failed = !!result.error && result.error.code !== '23505'
    if (failed) {
      set((state) => ({ known: { ...state.known, [track.id]: !next } }))
      return false
    }
    return next
  },
}))

/** Keeps the store bound to the signed-in user. Safe to call from every surface. */
export function useFavoritesSync(userId?: string | null) {
  const init = useFavoritesStore((s) => s.init)
  useEffect(() => { init(userId) }, [userId, init])
}

/** Single source of truth for the liked state of one track. */
export function useIsFavorite(trackId: string): boolean {
  return useFavoritesStore((s) => s.known[trackId] === true)
}

/** Fetches missing state for the given tracks (no-op while signed out). */
export function useEnsureFavorites(trackIds: (string | undefined)[]) {
  const ensure = useFavoritesStore((s) => s.ensure)
  const userId = useFavoritesStore((s) => s.userId)
  const key = trackIds.filter(Boolean).join('|')

  useEffect(() => {
    if (!userId || !key) return
    void ensure(key.split('|'))
  }, [userId, key, ensure])
}
