import { describe, expect, it } from 'vitest'
import { filterLibraryItems } from '@/lib/library/filterLibraryItems'
import { sortLibraryItems } from '@/lib/library/sortLibraryItems'
import { buildLibraryItems } from '@/lib/library/types'
import type { LibraryItem } from '@/lib/library/types'

function item(partial: Partial<LibraryItem> & Pick<LibraryItem, 'id' | 'title'>): LibraryItem {
  return {
    type: 'playlist',
    href: `/${partial.id}`,
    ...partial,
  }
}

describe('filterLibraryItems', () => {
  const items = [
    item({ id: '1', title: 'Samba de Roda', subtitle: '5 faixas', type: 'playlist' }),
    item({ id: '2', title: 'Rock Nacional', subtitle: '12 faixas', type: 'playlist' }),
    item({ id: '3', title: 'Caetano Veloso', type: 'artist' }),
  ] as LibraryItem[]

  it('encontra títulos acentuados por termos sem acento', () => {
    const result = filterLibraryItems(items, 'samba', null)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Samba de Roda')
  })

  it('ignora caixa e acentos ao normalizar a consulta', () => {
    const result = filterLibraryItems(items, 'SAMBA DE RODA', null)
    expect(result).toHaveLength(1)
  })

  it('considera o subtítulo pesquisável', () => {
    const result = filterLibraryItems(items, '12 faixas', null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('combina busca com filtro de tipo', () => {
    const result = filterLibraryItems(items, '', 'artist')
    expect(result.map((i) => i.id)).toEqual(['3'])
  })

  it('filtro de tipo + busca que só existe no outro tipo: vazio', () => {
    const result = filterLibraryItems(items, 'caetano', 'playlist')
    expect(result).toHaveLength(0)
  })

  it('consulta vazia e sem filtro devolve tudo', () => {
    expect(filterLibraryItems(items, '   ', null)).toHaveLength(3)
  })
})

describe('sortLibraryItems', () => {
  const items = [
    item({ id: 'a', title: 'Zeca Pagodinho', createdAt: '2024-01-01T00:00:00Z' }),
    item({ id: 'b', title: 'Almir Guinéto', createdAt: '2025-03-01T00:00:00Z' }),
    item({ id: 'c', title: 'Beth Carvalho', createdAt: null }),
  ] as LibraryItem[]

  it('ordena alfabeticamente sem acento e sem mutar o array', () => {
    const source = [...items]
    const result = sortLibraryItems(source, 'alphabetical')
    expect(result.map((i) => i.title)).toEqual(['Almir Guinéto', 'Beth Carvalho', 'Zeca Pagodinho'])
    expect(source.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('ordena por data real, itens sem data ao final', () => {
    const result = sortLibraryItems(items, 'recent')
    expect(result.map((i) => i.id)).toEqual(['b', 'a', 'c'])
  })

  it('ordenação estável para itens equivalentes', () => {
    const twins = [
      item({ id: 'x', title: 'Duo' }),
      item({ id: 'y', title: 'Duo' }),
      item({ id: 'z', title: 'Duas' }),
    ] as LibraryItem[]
    const result = sortLibraryItems(twins, 'alphabetical')
    expect(result.map((i) => i.id)).toEqual(['z', 'x', 'y'])
  })
})

describe('buildLibraryItems', () => {
  it('normaliza playlists e artistas no mesmo modelo', () => {
    const result = buildLibraryItems(
      [
        {
          id: 'p1',
          name: 'Madrugada',
          description: null,
          cover_url: null,
          cover_source: 'custom' as const,
          custom_cover_url: 'https://example.com/capa.jpg',
          last_track_cover_url: null,
          user_id: 'u1',
          created_at: '2025-01-10T00:00:00Z',
          updated_at: null,
          track_count: 3,
          is_public: false,
          collaborative: null,
          share_token: null,
        },
      ],
      [
        {
          artist_id: 'a1',
          artist_data: { id: 'a1', name: 'Gal Costa', image: 'https://example.com/gal.jpg' },
          followed_at: '2025-02-01T00:00:00Z',
        },
      ],
    )
    expect(result).toHaveLength(2)
    const playlist = result.find((r) => r.type === 'playlist')
    const artist = result.find((r) => r.type === 'artist')
    expect(playlist).toMatchObject({ title: 'Madrugada', imageUrl: 'https://example.com/capa.jpg', subtitle: '3 faixas' })
    expect(artist).toMatchObject({ title: 'Gal Costa', imageUrl: 'https://example.com/gal.jpg' })
  })
})
