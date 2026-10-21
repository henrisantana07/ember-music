import { describe, it, expect } from 'vitest'
import {
  rankPaletteCells,
  pickDistinctHues,
  type PaletteCell,
} from '@/lib/color/extractCoverPalette'

/** Monta células com matiz/saturação/luminosidade dados. */
function cell(h: number, s: number, l: number, hex = '#000000'): PaletteCell {
  return { h, s, l, hex }
}

describe('rankPaletteCells', () => {
  it('prefere a cor que cobre mais da arte à mais saturada isolada', () => {
    // Cinco células de azul (metade da grade) contra um vermelho saturado sozinho.
    const blue = [
      cell(0.58, 0.5, 0.5, '#2b5f9e'),
      cell(0.58, 0.5, 0.5, '#2b5f9e'),
      cell(0.58, 0.5, 0.5, '#2b5f9e'),
      cell(0.58, 0.5, 0.5, '#2b5f9e'),
      cell(0.58, 0.5, 0.5, '#2b5f9e'),
    ]
    const redAccent = cell(0.02, 0.95, 0.55, '#f21010')

    const ranked = rankPaletteCells([...blue, redAccent])

    expect(ranked[0].hex).toBe('#2b5f9e')
  })

  it('desempata por saturação quando a cobertura empata', () => {
    const muted = cell(0.1, 0.3, 0.55, '#8a6a4a')
    const vivid = cell(0.6, 0.8, 0.55, '#2f8fd6')

    const ranked = rankPaletteCells([muted, vivid])

    expect(ranked[0].hex).toBe('#2f8fd6')
  })

  it('desempata por luminosidade próxima do miolo da escala', () => {
    const nearBlack = cell(0.3, 0.6, 0.12, '#0a2a0a')
    const midTone = cell(0.3, 0.6, 0.55, '#3f8a3f')

    const ranked = rankPaletteCells([nearBlack, midTone])

    expect(ranked[0].hex).toBe('#3f8a3f')
  })

  it('devolve a mesma lista vazia para entrada vazia', () => {
    expect(rankPaletteCells([])).toEqual([])
  })

  it('não muta a lista de entrada', () => {
    const cells = [cell(0.1, 0.3, 0.5, '#a'), cell(0.6, 0.8, 0.5, '#b')]
    const snapshot = [...cells]

    rankPaletteCells(cells)

    expect(cells).toEqual(snapshot)
  })
})

describe('pickDistinctHues', () => {
  it('escolhe secondary e tertiary com matiz distinto da primary', () => {
    const primary = cell(0.02, 0.8, 0.55, '#e05a2b') // laranja
    const secondary = cell(0.55, 0.6, 0.5, '#2b6f9e') // azul
    const tertiary = cell(0.33, 0.55, 0.52, '#3f8a3f') // verde

    const out = pickDistinctHues([primary, secondary, tertiary])

    expect(out.secondary?.hex).toBe('#2b6f9e')
    expect(out.tertiary?.hex).toBe('#3f8a3f')
  })

  it('pula células de matiz quase igual à da primary', () => {
    const primary = cell(0.02, 0.8, 0.55, '#e05a2b')
    const nearDuplicate = cell(0.04, 0.7, 0.5, '#d95a35') // mesmo laranja
    const distinct = cell(0.6, 0.6, 0.5, '#2f7fbf')

    const out = pickDistinctHues([primary, nearDuplicate, distinct])

    expect(out.secondary?.hex).toBe('#2f7fbf')
  })

  it('cai na primary quando tudo tem o mesmo matiz (capa monocromática)', () => {
    const a = cell(0.02, 0.8, 0.55, '#e05a2b')
    const b = cell(0.02, 0.6, 0.5, '#c04e28')

    const out = pickDistinctHues([a, b])

    expect(out.secondary).toBeUndefined()
    expect(out.tertiary).toBeUndefined()
  })

  it('devolve objeto vazio para lista vazia', () => {
    expect(pickDistinctHues([])).toEqual({})
  })
})
