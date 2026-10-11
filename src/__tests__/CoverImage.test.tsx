import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { CoverImage } from '@/components/ui/CoverImage'

function getImg(): HTMLImageElement {
  return screen.getByRole('img') as HTMLImageElement
}

describe('CoverImage', () => {
  it('promove a capa de vídeo para maxresdefault', () => {
    render(<CoverImage src="https://i.ytimg.com/vi/abc123/hqdefault.jpg" alt="capa" />)
    expect(getImg().src).toBe('https://i.ytimg.com/vi/abc123/maxresdefault.jpg')
  })

  it('eleva capas do YouTube Music para =w1200', () => {
    render(<CoverImage src="https://lh3.googleusercontent.com/xyz=w120-h120-l90-rj" alt="capa" />)
    expect(getImg().src).toBe('https://lh3.googleusercontent.com/xyz=w1200-h1200-l90-rj')
  })

  it('monta a URL HD a partir do videoId quando não há src', () => {
    render(<CoverImage videoId="abc123" alt="capa" />)
    expect(getImg().src).toBe('https://i.ytimg.com/vi/abc123/maxresdefault.jpg')
  })

  it('renderiza placeholder quando não há src nem videoId', () => {
    render(<CoverImage src="" alt="capa" />)
    expect(getImg().src).toContain('/placeholder.svg')
  })

  it('volta para hqdefault quando a HD falha (404)', () => {
    render(<CoverImage src="https://i.ytimg.com/vi/abc123/hqdefault.jpg" alt="capa" />)
    fireEvent.error(getImg())
    expect(getImg().src).toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg')
  })

  it('usa placeholder quando HD e baixa resolução falham', () => {
    render(<CoverImage src="https://i.ytimg.com/vi/abc123/hqdefault.jpg" alt="capa" />)
    fireEvent.error(getImg())
    fireEvent.error(getImg())
    expect(getImg().src).toContain('/placeholder.svg')
  })

  it('faz downgrade quando a HD carrega como placeholder cinza (<640px)', () => {
    render(<CoverImage src="https://i.ytimg.com/vi/abc123/hqdefault.jpg" alt="capa" />)
    const img = getImg()
    Object.defineProperty(img, 'naturalWidth', { value: 120, configurable: true })
    fireEvent.load(img)
    expect(getImg().src).toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg')
  })

  it('mantém a HD quando carrega em resolução real', () => {
    render(<CoverImage src="https://i.ytimg.com/vi/abc123/hqdefault.jpg" alt="capa" />)
    const img = getImg()
    Object.defineProperty(img, 'naturalWidth', { value: 1280, configurable: true })
    fireEvent.load(img)
    expect(getImg().src).toBe('https://i.ytimg.com/vi/abc123/maxresdefault.jpg')
  })

  it('não tenta downgrade quando a fonte já está na menor resolução', () => {
    render(<CoverImage src="https://example.com/cover.jpg" alt="capa" />)
    const img = getImg()
    Object.defineProperty(img, 'naturalWidth', { value: 320, configurable: true })
    fireEvent.load(img)
    expect(getImg().src).toBe('https://example.com/cover.jpg')
  })

  it('sobe crossOrigin para leitura direta de pixels no canvas', () => {
    render(<CoverImage src="https://i.ytimg.com/vi/abc123/hqdefault.jpg" alt="capa" />)
    expect(getImg().getAttribute('crossorigin')).toBe('anonymous')
  })
})
