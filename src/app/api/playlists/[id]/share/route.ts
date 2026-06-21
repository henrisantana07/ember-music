import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: playlist } = await supabase
    .from('playlists')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!playlist) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase
    .from('playlists')
    .update({
      share_token: crypto.randomUUID(),
      collaborative: true,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: updated } = await supabase.from('playlists').select('share_token, collaborative').eq('id', id).single()
  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('playlists')
    .update({ share_token: null, collaborative: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
