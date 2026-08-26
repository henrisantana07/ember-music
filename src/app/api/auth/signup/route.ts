import { validatePassword } from '@/lib/password'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email =
    typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: 'Informe um email válido.' }, { status: 400 })
  }

  const check = await validatePassword(password)
  if (!check.valid) {
    return Response.json(
      {
        error: 'Senha não atende aos requisitos.',
        details: check.errors,
        score: check.score,
      },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ user: data.user, session: data.session }, { status: 201 })
}
