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

  /* Sem `emailRedirectTo`, o Supabase usa a Site URL cadastrada no Dashboard —
     que pode apontar para um deploy antigo e devolver o usuário a uma versão
     desatualizada do app. Segue a origem da requisição, que é o domínio que o
     usuário está usando agora (o allowlist do Dashboard continua obrigatório). */
  const origin =
    request.headers.get('origin') ??
    `https://${request.headers.get('host') ?? ''}`

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ user: data.user, session: data.session }, { status: 201 })
}
