'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Playlists fixadas manualmente na "Sua Biblioteca".
 *
 * O valor persistido é um **array ordenado de ids**: a posição no array é a
 * prioridade (ordem de chegada). A primeira playlist fixada fica em primeiro
 * entre as fixadas; desafixar remove o id e fixar de novo o recoloca no fim.
 *
 * Mesmo padrão de `use-library-preferences`: `useSyncExternalStore` sobre o
 * `localStorage`, com snapshot de servidor vazio (o SSR nunca lê o storage) e
 * validação do JSON para não deixar lixo entrar na UI. Nenhum schema novo no
 * Supabase — a preferência é local ao dispositivo.
 */

const STORAGE_KEY = 'ember:pinned-playlists'

const EMPTY: readonly string[] = []

type Listener = () => void

const listeners = new Set<Listener>()

function subscribe(listener: Listener) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function parse(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const ids: string[] = []
    for (const value of parsed) {
      if (typeof value === 'string' && value.length > 0 && !seen.has(value)) {
        seen.add(value)
        ids.push(value)
      }
    }
    return ids
  } catch {
    return []
  }
}

// Cache por `raw`: `getSnapshot` precisa devolver a mesma referência entre
// renders enquanto o armazenamento não muda.
let cached: { raw: string | null; value: string[] } | null = null

function getSnapshot(): string[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return EMPTY as string[]
  }
  if (cached !== null && cached.raw === raw) return cached.value
  cached = { raw, value: parse(raw) }
  return cached.value
}

function getServerSnapshot(): string[] {
  return EMPTY as string[]
}

function write(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Armazenamento indisponível: o fixado vive só nesta sessão.
  }
  listeners.forEach((listener) => listener())
}

export function usePinnedPlaylists(): {
  /** Ids na ordem de fixação (primeiro = maior prioridade). */
  ids: string[]
  isPinned: (playlistId: string) => boolean
  /** Fixa (no fim da fila) ou desafixa, conforme o estado atual. */
  toggle: (playlistId: string) => void
} {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const isPinned = useCallback((playlistId: string) => ids.includes(playlistId), [ids])

  const toggle = useCallback((playlistId: string) => {
    const current = getSnapshot()
    const next = current.includes(playlistId)
      ? current.filter((value) => value !== playlistId)
      : [...current, playlistId]
    write(next)
  }, [])

  return { ids, isPinned, toggle }
}
