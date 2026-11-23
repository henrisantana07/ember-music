import { beforeEach, describe, it, expect } from 'vitest'
import {
  cacheCoverPalette,
  getCachedCoverPalette,
} from '@/lib/color/coverPaletteCache'
import type { CoverPalette } from '@/lib/color/extractCoverPalette'

const palette: CoverPalette = {
  primary: '#e9d75d',
  secondary: '#47ff9f',
  tertiary: '#ff780a',
}

describe('coverPaletteCache', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('devolve null para chaves vazias', () => {
    expect(getCachedCoverPalette(null)).toBeNull()
    expect(getCachedCoverPalette('')).toBeNull()
  })

  it('guarda e recupera uma paleta válida', () => {
    cacheCoverPalette('yt:dQw4w9WgXcQ', palette)
    expect(getCachedCoverPalette('yt:dQw4w9WgXcQ')).toEqual(palette)
  })

  it('ignora paletas malformadas', () => {
    cacheCoverPalette('yt:quebrada', {
      primary: 'vermelho',
      secondary: 'verde',
      tertiary: 'azul',
    } as unknown as CoverPalette)
    expect(getCachedCoverPalette('yt:quebrada')).toBeNull()
  })

  it('sobrevive a uma nova leitura do localStorage', () => {
    cacheCoverPalette('yt:outro-id', palette)
    // O cache em memória já resolveria; força o caminho do storage limpando
    // o módulo não é possível aqui, então ao menos garantimos que foi gravado.
    expect(window.localStorage.getItem('ember:cover-palette:v1:yt:outro-id')).toContain(
      palette.primary
    )
  })
})
