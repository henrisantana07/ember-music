import { describe, it, expect } from 'vitest'
import { decodeHtmlEntities } from '@/lib/html-entities'

describe('decodeHtmlEntities', () => {
  it('decodifica o apóstrofo do título do YouTube', () => {
    expect(decodeHtmlEntities('What&#39;s Up?')).toBe("What's Up?")
    expect(decodeHtmlEntities("It&#39;s Raining")).toBe("It's Raining")
  })

  it('decodifica entidades numéricas hexadecimais', () => {
    expect(decodeHtmlEntities('Don&#x27;t Stop')).toBe("Don't Stop")
    expect(decodeHtmlEntities('A &#x2014; B')).toBe('A — B')
  })

  it('decodifica entidades nomeadas comuns', () => {
    expect(decodeHtmlEntities('Rock &amp; Roll')).toBe('Rock & Roll')
    expect(decodeHtmlEntities('&quot;Live&quot; &lt;3')).toBe('"Live" <3')
    expect(decodeHtmlEntities('A&amp;B &#39; C')).toBe("A&B ' C")
  })

  it('não decodifica duas vezes', () => {
    expect(decodeHtmlEntities('&amp;#39;')).toBe('&#39;')
  })

  it('preserva texto sem entidades', () => {
    expect(decodeHtmlEntities("80's 90's Music Video's")).toBe("80's 90's Music Video's")
    expect(decodeHtmlEntities('')).toBe('')
  })
})
