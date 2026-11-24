import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { extractPalette } from '@/lib/palette'

describe('extractPalette com capa preta', () => {
  it('devolve preto em vez de uma cor inventada', async () => {
    const input = await sharp({
      create: { width: 640, height: 360, channels: 3, background: '#000000' },
    })
      .png()
      .toBuffer()

    const palette = await extractPalette(input)

    expect(palette.isFallback).toBe(false)
    expect(palette.primary.toLowerCase()).toBe('#000000')
    expect(palette.base.toLowerCase()).toBe('#000000')
    // secondary tem uma leve variação de cinza para dar profundidade ao CSS
    expect(parseInt(palette.secondary.slice(1, 3), 16)).toBeLessThan(20)
    expect(palette.secondary.slice(1, 3)).toBe(palette.secondary.slice(3, 5))
  })

  it('continua realçando capas coloridas', async () => {
    const input = await sharp({
      create: { width: 640, height: 360, channels: 3, background: '#1030c0' },
    })
      .png()
      .toBuffer()

    const palette = await extractPalette(input)
    expect(palette.primary.toLowerCase()).not.toBe('#000000')
  })
})
