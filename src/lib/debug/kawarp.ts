/**
 * Logs de diagnóstico do Kawarp/hero.
 *
 * Ficam ativos em desenvolvimento e podem ser ligados em produção com
 * `NEXT_PUBLIC_KAWARP_DEBUG=1` no `.env.local`. Em teste (`NODE_ENV=test`)
 * ficam desligados para não poluir a saída do Vitest.
 */
export const KAWARP_DEBUG =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_KAWARP_DEBUG === '1'

export function logKawarp(event: string, payload?: unknown) {
  if (!KAWARP_DEBUG || typeof console === 'undefined') return
  if (payload === undefined) {
    console.info(`[ember/kawarp] ${event}`)
  } else {
    console.info(`[ember/kawarp] ${event}`, payload)
  }
}
