import type { CoverPalette } from './extractCoverPalette'

/**
 * Cache de paletas "extraídas uma vez".
 *
 * A paleta da capa é derivada de dados públicos e determinísticos (o ID do
 * vídeo -> thumbnail do CDN -> cores). Não há motivo para refazer esse trabalho
 * a cada troca de faixa, muito menos chamar a YouTube Data API para isso.
 *
 * Guardamos em memória (rápido, serve SSR/testes) e espelhamos no localStorage
 * (sobrevive a recarregar a página). Tudo com try/catch: se o navegador bloquear
 * storage em modo privado, o cache em memória continua funcionando.
 */
/* v3: as versões anteriores descartavam preto/cinza e guardavam uma cor
   inventada para capas monocromáticas. Sem trocar o prefixo, a paleta antiga
   sobrevivia 7 dias no localStorage e mascarava a correção. */
const STORAGE_PREFIX = 'ember:cover-palette:v3:'
const LEGACY_PREFIXES = ['ember:cover-palette:v1:', 'ember:cover-palette:v2:']

function purgeLegacy(): void {
  if (typeof window === 'undefined') return
  try {
    // `key(i)` em vez de Object.keys: some ambientes (jsdom, WebViews) não
    // enumeram as chaves do Storage como propriedades do objeto.
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i)
      if (key && LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        window.localStorage.removeItem(key)
      }
    }
  } catch { /* storage indisponível */ }
}
const TTL_MS = 7 * 24 * 60 * 60 * 1000

type CacheEntry = {
  at: number
  palette: CoverPalette
}

const memory = new Map<string, CacheEntry>()

const HEX = /^#[0-9a-f]{6}$/i

function isPalette(value: unknown): value is CoverPalette {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.primary === 'string' &&
    HEX.test(candidate.primary) &&
    typeof candidate.secondary === 'string' &&
    HEX.test(candidate.secondary) &&
    typeof candidate.tertiary === 'string' &&
    HEX.test(candidate.tertiary)
  )
}

function isFresh(entry: CacheEntry | null | undefined): entry is CacheEntry {
  return !!entry && Date.now() - entry.at < TTL_MS && isPalette(entry.palette)
}

export function getCachedCoverPalette(key?: string | null): CoverPalette | null {
  if (!key) return null
  purgeLegacy()

  const inMemory = memory.get(key)
  if (isFresh(inMemory)) return inMemory.palette

  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (!isFresh(parsed)) {
      window.localStorage.removeItem(STORAGE_PREFIX + key)
      return null
    }
    memory.set(key, parsed)
    return parsed.palette
  } catch {
    return null
  }
}

export function cacheCoverPalette(
  key: string | null | undefined,
  palette: CoverPalette | null | undefined
): void {
  if (!key || !palette || !isPalette(palette)) return

  const entry: CacheEntry = { at: Date.now(), palette }
  memory.set(key, entry)

  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // Storage cheio/bloqueado não pode quebrar a hero.
  }
}
