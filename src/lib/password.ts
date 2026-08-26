// Server-only: não importe este módulo de componentes client.
import { createHash } from 'crypto'

const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', '123456789', '1234567', 'qwerty',
  'abc123', 'letmein', 'monkey', '1234567890', 'iloveyou', 'password1',
  '000000', 'passw0rd', 'senha', 'senha123', '123123', 'admin', 'welcome',
  'login', 'dragon', 'sunshine', 'princess', 'football', 'baseball',
  'superman', 'qwerty123', '1q2w3e4r', 'batman', 'trustno1', 'whatever',
  'shadow', 'master', 'hello', 'freedom', '1234', '111111', '12345',
  'charlie', 'aa123456', 'pass@123', '123abc', 'admin123', 'teste', 'teste123',
])

export type PasswordCheck = {
  valid: boolean
  score: number
  errors: string[]
}

export async function validatePassword(password: string): Promise<PasswordCheck> {
  const errors: string[] = []
  let score = 0

  if (!password || password.length < 8) {
    errors.push('A senha deve ter ao menos 8 caracteres.')
  } else {
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1

    const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) =>
      r.test(password),
    ).length
    if (classes >= 3) score += 1
    if (classes === 4) score += 1
  }

  if (password && COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Senha muito comum. Escolha algo mais único.')
  }

  const pwned = await isPwned(password)
  if (pwned) {
    errors.push('Esta senha já apareceu em vazamentos conhecidos. Escolha outra.')
  }

  const valid = errors.length === 0 && score >= 2
  return { valid, score, errors }
}

async function isPwned(password: string): Promise<boolean> {
  if (!password) return false
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'ember-music', 'Add-Padding': 'true' },
    })
    if (!res.ok) return false
    const text = await res.text()
    return text.split(/\r?\n/).some((line) => {
      const hashSuffix = line.split(':')[0].trim().toUpperCase()
      return hashSuffix === suffix
    })
  } catch {
    return false
  }
}
