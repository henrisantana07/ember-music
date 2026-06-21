import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { artist_id, artist_data, follow } = body

  if (!artist_id) return NextResponse.json({ error: 'artist_id required' }, { status: 400 })

  if (follow === false) {
    const { error } = await supabase
      .from('followed_artists')
      .delete()
      .eq('user_id', user.id)
      .eq('artist_id', artist_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ following: false })
  }

  const { error } = await supabase
    .from('followed_artists')
    .insert({ user_id: user.id, artist_id, artist_data })

  if (error?.code === '23505') return NextResponse.json({ following: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ following: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('followed_artists')
    .select('*')
    .eq('user_id', user.id)
    .order('followed_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
