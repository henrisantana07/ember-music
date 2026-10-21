import { describe, it, expect } from 'vitest'
import {
  hexToRgb,
  rgbToHsl,
  hslToHex,
  chroma,
  luminanceSkill,
  scoreCluster,
} from '@/lib/color/extract-track-color'

describe('hexToRgb', () => {
  it('preserva # e sem #', () => {
    expect(hexToRgb('#FF8800')).toEqual({ r: 255, g: 136, b: 0 })
    expect(hexToRgb('FF8800')).toEqual({ r: 255, g: 136, b: 0 })
    expect(hexToRgb('000000')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('rejects tokens CSS e hex truncados', () => {
    expect(hexToRgb('var(--accent-from)')).toBeNull()
    expect(hexToRgb('#FF')).toBeNull()
    expect(hexToRgb('#')).toBeNull()
    expect(hexToRgb('')).toBeNull()
  })
})

describe('rgbToHsl / hslToHex', () => {
  it('roundtrip preserva cor com tolerância de 1', () => {
    const cases = [[255, 0, 0], [0, 128, 255], [42, 200, 100], [10, 10, 10]]
    for (const [r, g, b] of cases) {
      const { h, s, l } = rgbToHsl(r, g, b)
      const hex = hslToHex(h, s, l)
      const back = hexToRgb(hex)!
      expect(Math.abs(back.r - r)).toBeLessThanOrEqual(1)
      expect(Math.abs(back.g - g)).toBeLessThanOrEqual(1)
      expect(Math.abs(back.b - b)).toBeLessThanOrEqual(1)
    }
  })

  it('preto puro e branco puro', () => {
    expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 })
    expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 1 })
  })

  it('vermelho puro', () => {
    const { h, s, l } = rgbToHsl(255, 0, 0)
    expect(h).toBeCloseTo(0, 5)
    expect(s).toBe(1)
    expect(l).toBeCloseTo(0.5, 5)
  })

  it('hslToHex(0, 1, 0.5) = #ff0000', () => {
    expect(hslToHex(0, 1, 0.5)).toBe('#ff0000')
  })
})

describe('chroma', () => {
  it('cinza puro tem chroma 0', () => {
    expect(chroma(0.5, 0.5, 0.5)).toBe(0)
  })

  it('cor saturada tem chroma alto (>1)', () => {
    expect(chroma(1, 0, 0)).toBeGreaterThan(1)
  })
})

describe('luminanceSkill', () => {
  it('preto e branco', () => {
    expect(luminanceSkill(0, 0, 0)).toBe(0)
    expect(luminanceSkill(1, 1, 1)).toBeCloseTo(1, 5)
  })

  it('verde > vermelho > azul (pesos perceptuais)', () => {
    const green = luminanceSkill(0, 1, 0)
    const red = luminanceSkill(1, 0, 0)
    const blue = luminanceSkill(0, 0, 1)
    expect(green).toBeGreaterThan(red)
    expect(red).toBeGreaterThan(blue)
  })
})

describe('scoreCluster', () => {
  it('cluster mais dominante vence quando chroma empata', () => {
    const centroid = { r: 100, g: 100, b: 100 }
    const big = scoreCluster(centroid, 1050, 1050)
    const small = scoreCluster(centroid, 5, 1050)
    expect(big).toBeGreaterThan(small)
  })

  it('cluster mais cromático vence quando dominance empata', () => {
    const gray = { r: 100, g: 100, b: 100 }
    const blue = { r: 40, g: 100, b: 200 }
    const a = scoreCluster(gray, 100, 1000)
    const b = scoreCluster(blue, 100, 1000)
    expect(b).toBeGreaterThan(a)
  })

  it('totalPixels=0 não explode (dominância zero)', () => {
    const c = { r: 100, g: 100, b: 100 }
    expect(Number.isFinite(scoreCluster(c, 10, 0))).toBe(true)
  })
})
