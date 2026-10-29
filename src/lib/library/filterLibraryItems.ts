import type { LibraryItem, LibraryItemType } from './types'

/**
 * Busca e filtro de tipo sobre a biblioteca, como funções puras (§5.1).
 *
 * A busca é local: nenhum termo dispara chamada externa de busca musical.
 * Normalização de caixa e acentos com `normalize('NFD')` para que "samba"
 * encontre "Samba".
 */
export function filterLibraryItems<T extends Pick<LibraryItem, 'title' | 'subtitle' | 'type'>>(
  items: T[],
  query: string,
  type: LibraryItemType | null,
): T[] {
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()

  const normalizedQuery = normalize(query.trim())

  return items.filter((item) => {
    const matchesType = type === null || item.type === type
    const searchable = normalize([item.title, item.subtitle ?? ''].join(' '))
    return matchesType && (normalizedQuery === '' || searchable.includes(normalizedQuery))
  })
}
