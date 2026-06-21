import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { track_id, track_data } = body

  if (!track_id) {
    return NextResponse.json({ error: 'track_id is required' }, { status: 400 })
  }

  const { data: playlist } = await supabase
    .from('playlists')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!playlist) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
  }

  const { data: existing } = await supabase
    .from('playlist_tracks')
    .select('id')
    .eq('playlist_id', id)
    .eq('track_id', track_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Track already in playlist' }, { status: 409 })
  }

  const { data: maxPos } = await supabase
    .from('playlist_tracks')
    .select('position')
    .eq('playlist_id', id)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = (maxPos?.[0]?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('playlist_tracks')
    .insert({
      playlist_id: id,
      track_id,
      track_data,
      position: nextPosition,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { track_id } = body

  if (!track_id) {
    return NextResponse.json({ error: 'track_id is required' }, { status: 400 })
  }

  const { data: playlist } = await supabase
    .from('playlists')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!playlist) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('playlist_tracks')
    .delete()
    .eq('playlist_id', id)
    .eq('track_id', track_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
