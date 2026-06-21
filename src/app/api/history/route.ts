import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { track_id, track_data } = body

  if (!track_id) return NextResponse.json({ error: 'track_id required' }, { status: 400 })

  const { error } = await supabase.from('listening_history').insert({
    user_id: user.id,
    track_id,
    track_data,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('listening_history')
    .select('*')
    .eq('user_id', user.id)
    .order('played_at', { ascending: false })
    .limit(50)

  return NextResponse.json(data ?? [])
}
