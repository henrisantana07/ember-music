import { describe, it, expect } from 'vitest'
import { vibrateColor } from '@/lib/color/extractDominantColor'

function luminance(hex: string): number {
  const int = parseInt(hex.slice(1), 16)
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function saturation(hex: string): number {
  const int = parseInt(hex.slice(1), 16)
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const l = (max + min) / 2
  const d = max - min
  return l > 0.5 ? d / (2 - max - min) : d / (max + min)
}

describe('vibrateColor', () => {
  it('preserva cores muito escuras em vez de inventar uma cor viva', () => {
    expect(vibrateColor('#020302')).toBe('#020302')
  })

  it('preserva cinzas neutros em vez de inventar saturação', () => {
    expect(vibrateColor('#8a8a8a')).toBe('#8a8a8a')
  })

  it('ainda vibra cores lavadas que têm matiz', () => {
    const out = vibrateColor('#b39a8a')
    expect(saturation(out)).toBeGreaterThanOrEqual(0.4)
    expect(luminance(out)).toBeGreaterThanOrEqual(0.45)
  })

  it('não altera cores já vibrantes', () => {
    const vivid = '#e05a2b'
    expect(vibrateColor(vivid)).toBe(vivid)
  })

  it('mantém o matiz original ao corrigir luminosidade', () => {
    const out = vibrateColor('#1a5c1a')
    const int = parseInt(out.slice(1), 16)
    const r = (int >> 16) & 255
    const g = (int >> 8) & 255
    const b = int & 255
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
  })

  it('retorna a entrada intacta para entradas inválidas', () => {
    expect(vibrateColor('not-a-color')).toBe('not-a-color')
    expect(vibrateColor('#fff')).toBe('#fff')
  })
})
