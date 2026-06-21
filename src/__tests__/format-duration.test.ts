import { describe, it, expect } from 'vitest'
import { formatDuration } from '@/lib/jamendo'

describe('formatDuration', () => {
  it('formats 0 seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('formats seconds < 60', () => {
    expect(formatDuration(45)).toBe('0:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05')
  })

  it('formats hours', () => {
    expect(formatDuration(3661)).toBe('61:01')
  })
})
