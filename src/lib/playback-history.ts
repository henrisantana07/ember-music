import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Track } from '@/types/music'

export interface PlaybackHistoryItem {
  id: string
  user_id: string
  track_id: string
  track_data: Track
  played_at: string
}

export async function getPlaybackHistory(user: User | null): Promise<PlaybackHistoryItem[]> {
  if (!user) return []
  
  const supabase = createClient()
  const { data, error } = await supabase
    .from('listening_history')
    .select('*')
    .eq('user_id', user.id)
    .order('played_at', { ascending: false })
    .limit(50)
  
  if (error) {
    console.error('Error fetching playback history:', error)
    return []
  }
  
  return data as unknown as PlaybackHistoryItem[]
}

export async function savePlaybackHistory(user: User | null, track: Track): Promise<void> {
  if (!user) return
  
  const supabase = createClient()
  const { error } = await supabase
    .from('listening_history')
    .insert({
      user_id: user.id,
      track_id: track.id,
      track_data: track,
      played_at: new Date().toISOString(),
    })
  
  if (error) {
    console.error('Error saving playback history:', error)
  }
}
