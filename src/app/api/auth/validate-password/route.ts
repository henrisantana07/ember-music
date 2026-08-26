import { validatePassword } from '@/lib/password'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const password = typeof body?.password === 'string' ? body.password : ''

  const result = await validatePassword(password)
  return Response.json(result)
}
