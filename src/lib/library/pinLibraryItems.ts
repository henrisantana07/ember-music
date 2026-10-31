import type { LibraryItem } from './types'

/**
 * Reordena a biblioteca colocando as playlists fixadas primeiro, **na ordem
 * em que foram fixadas** (prioridade/chegada). A primeira fixada fica em
 * primeiro; desafixar e fixar de novo manda a playlist para o fim da fila.
 *
 * - Só playlists podem ser fixadas; ids desconhecidos (playlist removida, por
 *   exemplo) são simplesmente ignorados.
 * - Pura e estável: devolve um array novo e não muta a entrada.
 */
export function orderPinnedFirst<T extends Pick<LibraryItem, 'id' | 'type'>>(
  items: T[],
  pinnedIds: readonly string[],
): T[] {
  if (pinnedIds.length === 0) return [...items]

  const rank = new Map(pinnedIds.map((id, index) => [id, index]))
  const pinned: T[] = []
  const rest: T[] = []

  for (const item of items) {
    if (item.type === 'playlist' && rank.has(item.id)) pinned.push(item)
    else rest.push(item)
  }

  pinned.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))

  return [...pinned, ...rest]
}
