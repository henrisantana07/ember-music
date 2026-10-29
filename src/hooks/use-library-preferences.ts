'use client'

import { useCallback, useSyncExternalStore } from 'react'
import type { LibrarySort, LibraryView } from '@/lib/library/types'

/**
 * Preferências exclusivamente visuais da biblioteca (§6): modo de
 * visualização e ordenação, em `localStorage`.
 *
 * Usa `useSyncExternalStore` em vez de hidratar com `setState` dentro de um
 * effect: o armazenamento é um sistema externo com o que o React se
 * sincroniza, sem renderização em cascata no mount.
 *
 * - `getServerSnapshot` devolve o default, então o SSR não toca em
 *   `localStorage` e o cliente corrige só quando houver valor salvo.
 * - Valores recuperados são validados contra a lista conhecida; JSON velho ou
 *   inválido cai no default em vez de entrar na UI sem verificação.
 * - `localStorage` indisponível (SSR, modo privado, quota) não quebra nada:
 *   `try/catch` em leitura e escrita.
 */
interface LibraryPrefs {
  view: LibraryView
  sort: LibrarySort
}

const STORAGE_KEY = 'ember:library-prefs'

const VIEWS: LibraryView[] = ['compact', 'list', 'grid']
const SORTS: LibrarySort[] = ['recent', 'alphabetical']

const DEFAULTS: LibraryPrefs = { view: 'list', sort: 'recent' }

function parse(raw: string | null): LibraryPrefs {
  if (!raw) return { ...DEFAULTS }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULTS }
    const record = parsed as Partial<LibraryPrefs>
    return {
      view: VIEWS.includes(record.view as LibraryView) ? (record.view as LibraryView) : DEFAULTS.view,
      sort: SORTS.includes(record.sort as LibrarySort) ? (record.sort as LibrarySort) : DEFAULTS.sort,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

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

// Cache por `raw`, porque `getSnapshot` precisa devolver a mesma referência
// entre renders quando o armazenamento não muda.
let cached: { raw: string | null; value: LibraryPrefs } | null = null

function getSnapshot(): LibraryPrefs {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return DEFAULTS
  }
  if (cached !== null && cached.raw === raw) return cached.value
  cached = { raw, value: parse(raw) }
  return cached.value
}

function getServerSnapshot(): LibraryPrefs {
  return DEFAULTS
}

function writePrefs(prefs: LibraryPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Armazenamento indisponível: a preferência vive só nesta sessão.
  }
  listeners.forEach((listener) => listener())
}

export function useLibraryPreferences(): {
  prefs: LibraryPrefs
  update: (next: Partial<LibraryPrefs>) => void
} {
  // A UI só alterna visão/ordenação após interação do usuário, então o valor
  // hidratado nunca diverge de forma visível durante o primeiro paint.
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const update = useCallback((next: Partial<LibraryPrefs>) => {
    const current = getSnapshot()
    writePrefs({
      view: next.view ?? current.view,
      sort: next.sort ?? current.sort,
    })
  }, [])

  return { prefs, update }
}
