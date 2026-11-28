import { describe, expect, it } from 'vitest'
import { readableQuery } from '@/components/explore/SearchHistory'

describe('readableQuery', () => {
  it('mostra o termo legível de uma URL do YouTube', () => {
    expect(readableQuery('https://www.youtube.com/watch?v=dRVNZJCLXs')).toContain('Vídeo')
    expect(readableQuery('https://www.youtube.com/results?search_query=estopin+slow')).toBe('estopin slow')
  })

  it('esconde IDs e links encurtados', () => {
    const id = readableQuery('https://youtu.be/dRVNZJCLXs')
    expect(id).toMatch(/^Vídeo /)
    expect(id).not.toContain('http')
    expect(readableQuery('dRVNZJCLXs&list=OLAK5uy_ngMYEA')).toContain('Playlist')
  })

  it('mantém termos comuns digitados pelo usuário', () => {
    expect(readableQuery('from GTAVI: The Album')).toBe('from GTAVI: The Album')
    expect(readableQuery('estopin Slow album')).toBe('estopin Slow album')
  })
})
