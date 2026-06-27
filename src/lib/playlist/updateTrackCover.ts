import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function updateTrackCoverIfNeeded(
  supabase: SupabaseClient<Database>,
  playlistId: string,
  addedTrackCoverUrl: string
): Promise<void> {
  const { data: playlist } = await supabase
    .from('playlists')
    .select('cover_source')
    .eq('id', playlistId)
    .single()

  if (playlist?.cover_source === 'custom') return

  await supabase
    .from('playlists')
    .update({
      cover_source: 'track',
      last_track_cover_url: addedTrackCoverUrl,
    })
    .eq('id', playlistId)
}
