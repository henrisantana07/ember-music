import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function removeCustomCover(
  supabase: SupabaseClient<Database>,
  playlistId: string,
  userId: string
): Promise<void> {
  await supabase.storage
    .from('playlist-covers')
    .remove([`${userId}/${playlistId}/cover`])

  const { count } = await supabase
    .from('playlist_tracks')
    .select('id', { count: 'exact', head: true })
    .eq('playlist_id', playlistId)

  if (count && count > 0) {
    const { data: lastTrack } = await supabase
      .from('playlist_tracks')
      .select('track_data')
      .eq('playlist_id', playlistId)
      .order('added_at', { ascending: false })
      .limit(1)
      .single()

    const coverUrl = lastTrack?.track_data
      ? (lastTrack.track_data as { image?: string })?.image ?? null
      : null

    await supabase
      .from('playlists')
      .update({
        cover_source: 'track',
        custom_cover_url: null,
        last_track_cover_url: coverUrl,
      })
      .eq('id', playlistId)
  } else {
    await supabase
      .from('playlists')
      .update({
        cover_source: 'branded',
        custom_cover_url: null,
        last_track_cover_url: null,
      })
      .eq('id', playlistId)
  }
}
