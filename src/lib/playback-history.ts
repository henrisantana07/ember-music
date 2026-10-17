import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Track } from '@/types/music'
import type { Json } from '@/types/database'

export interface PlaybackHistoryItem {
  id: string
  user_id: string
  track_id: string
  track_data: Track
  played_at: string
}

// `maxRows` limita quantas linhas são buscadas. A home precisa só das mais
// recentes e a página de histórico continua sem limite (padrão 0 = tudo,
// comportamento original preservado para os callers atuais).
export async function getPlaybackHistory(user: User | null, maxRows = 0): Promise<PlaybackHistoryItem[]> {
  if (!user) return []
  
  const supabase = createClient()
  const pageSize = maxRows > 0 ? Math.min(500, maxRows) : 500
  const all: PlaybackHistoryItem[] = []
  let from = 0

  // Percorre todas as páginas até buscar o histórico completo
  for (;;) {
    const { data, error } = await supabase
      .from('listening_history')
      .select('*')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('Error fetching playback history:', error)
      return all
    }

    all.push(...(data as unknown as PlaybackHistoryItem[]))
    if (!data || data.length < pageSize) break
    if (maxRows > 0 && all.length >= maxRows) return all.slice(0, maxRows)
    from += pageSize
  }

  return maxRows > 0 ? all.slice(0, maxRows) : all
}

export async function savePlaybackHistory(user: User | null, track: Track): Promise<void> {
  if (!user) return
  
  const supabase = createClient()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('listening_history')
    .upsert({
      user_id: user.id,
      track_id: track.id,
      track_data: track as unknown as Json,
      played_at: now,
    }, { onConflict: 'user_id,track_id', ignoreDuplicates: false })
  
  if (error) {
    console.error('Error saving playback history:', error)
  }
}
