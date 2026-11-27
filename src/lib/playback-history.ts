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
  /** Presente depois das migrations de contagem e tempo acumulado. */
  play_count?: number
  listened_seconds?: number
}

/* Tempo acumulado neste dispositivo enquanto a migration não é aplicada. */
const LOCAL_SECONDS_KEY = 'ember:listening-seconds'

export function getLocalListeningSeconds(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LOCAL_SECONDS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function saveLocalListeningSeconds(trackId: string, seconds: number): void {
  if (typeof window === 'undefined' || seconds <= 0) return
  const all = getLocalListeningSeconds()
  all[trackId] = (all[trackId] ?? 0) + seconds
  try {
    window.localStorage.setItem(LOCAL_SECONDS_KEY, JSON.stringify(all))
  } catch { /* storage indisponível */ }
}

/* Enquanto a migration não é aplicada, o contador vive neste dispositivo.
   Assim "mais tocadas" já reflete repetições mesmo sem o campo no banco. */
const LOCAL_COUNT_KEY = 'ember:play-counts'

export function getLocalPlayCounts(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LOCAL_COUNT_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function bumpLocalPlayCount(trackId: string): Record<string, number> {
  const counts = getLocalPlayCounts()
  counts[trackId] = (counts[trackId] ?? 0) + 1
  try {
    window.localStorage.setItem(LOCAL_COUNT_KEY, JSON.stringify(counts))
  } catch { /* storage indisponível */ }
  return counts
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

  /* Caminho preferencial: incremento atômico no banco (migration aplicada). */
  const { error: rpcError } = await supabase.rpc('increment_listening_play', {
    p_user_id: user.id,
    p_track_id: track.id,
    p_track_data: track as unknown as Json,
  })

  if (!rpcError) return

  /* Compatibilidade: banco sem a migration ainda conta no dispositivo e
     mantém o upsert antigo de `played_at`. */
  bumpLocalPlayCount(track.id)
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

/** Soma segundos reais de escuta de uma faixa ao histórico. */
export async function saveListeningTime(user: User | null, track: Track, seconds: number): Promise<void> {
  if (seconds <= 0) return
  if (!user) {
    saveLocalListeningSeconds(track.id, seconds)
    return
  }
  const supabase = createClient()
  const { error } = await supabase.rpc('add_listening_seconds', {
    p_user_id: user.id,
    p_track_id: track.id,
    p_seconds: Math.floor(seconds),
    p_track_data: track as unknown as Json,
  })
  /* Sem a migration, o tempo vive neste dispositivo e já ordena a fileira. */
  if (error) saveLocalListeningSeconds(track.id, seconds)
}
