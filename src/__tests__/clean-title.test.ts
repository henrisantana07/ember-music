import { describe, expect, it } from 'vitest'
import { cleanDisplayTitle } from '@/lib/clean-title'

describe('cleanDisplayTitle', () => {
  it('remove sufixos de ruído entre parênteses', () => {
    expect(cleanDisplayTitle('Song (Official Video)')).toBe('Song')
    expect(cleanDisplayTitle('Song (Official Audio)')).toBe('Song')
    expect(cleanDisplayTitle('Song (Lyric Video)')).toBe('Song')
    expect(cleanDisplayTitle('Song (Lyrics)')).toBe('Song')
    expect(cleanDisplayTitle('Song [Official Video]')).toBe('Song')
    expect(cleanDisplayTitle('Song (Visualizer)')).toBe('Song')
    expect(cleanDisplayTitle('Song (Performance Video)')).toBe('Song')
    expect(cleanDisplayTitle('Song (M/V)')).toBe('Song')
    expect(cleanDisplayTitle('Song (4K)')).toBe('Song')
  })

  it('remove múltiplos sufixos de uma vez', () => {
    expect(cleanDisplayTitle('Song (Official Audio) (Visualizer)')).toBe('Song')
  })

  it('mantém conteúdo significativo entre parênteses', () => {
    expect(cleanDisplayTitle('Song (Live)')).toBe('Song (Live)')
    expect(cleanDisplayTitle('Song (feat. Guest)')).toBe('Song (feat. Guest)')
    expect(cleanDisplayTitle('Song (Remix)')).toBe('Song (Remix)')
    expect(cleanDisplayTitle('Song (Acoustic)')).toBe('Song (Acoustic)')
  })

  it('remove prefixo "Artista - " quando casa com o artista', () => {
    expect(cleanDisplayTitle('Adele - Hello', 'Adele')).toBe('Hello')
    expect(cleanDisplayTitle('adele - Hello', 'Adele')).toBe('Hello')
    expect(cleanDisplayTitle('Adele: Hello', 'Adele')).toBe('Hello')
  })

  it('não remove prefixo de outro artista', () => {
    expect(cleanDisplayTitle('Adele - Hello', 'Someone Else')).toBe('Adele - Hello')
  })

  it('combina limpeza de sufixo e prefixo', () => {
    expect(cleanDisplayTitle('Adele - Hello (Official Video)', 'Adele')).toBe('Hello')
  })

  it('limpa separadores órfãos no final', () => {
    expect(cleanDisplayTitle('Song - ')).toBe('Song')
  })

  it('devolve o título original se a limpeza zerar tudo', () => {
    expect(cleanDisplayTitle('(Official Video)', 'Adele')).toBe('(Official Video)')
  })
})
