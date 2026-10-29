import type { LibraryItem, LibrarySort } from './types'

/**
 * Ordenação estável e pura (§5.2): nunca muta o array recebido.
 *
 * - `recent`: data real do banco, descendente; itens sem data ficam por último.
 * - `alphabetical`: `localeCompare`, sensível ao idioma e a acentos.
 */
export function sortLibraryItems<T extends Pick<LibraryItem, 'title' | 'createdAt'>>(
  items: T[],
  sort: LibrarySort,
): T[] {
  const copy = [...items]

  if (sort === 'recent') {
    copy.sort((a, b) => {
      const timeA = a.createdAt ? Date.parse(a.createdAt) : Number.NaN
      const timeB = b.createdAt ? Date.parse(b.createdAt) : Number.NaN
      const validA = !Number.isNaN(timeA)
      const validB = !Number.isNaN(timeB)
      if (validA && validB) return timeB - timeA
      if (validA) return -1
      if (validB) return 1
      return 0
    })
    return copy
  }

  copy.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
  return copy
}
