import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { KawarpBackground } from '@/components/Player/KawarpBackground'

// Mock dynamic import of @kawarp/react
vi.mock('@kawarp/react', () => ({
  Kawarp: ({ src, className, animationSpeed }: { src: string; className?: string; animationSpeed?: number }) => (
    <div data-testid="kawarp-canvas" data-src={src} data-speed={animationSpeed} className={className} />
  ),
}))

describe('KawarpBackground', () => {
  it('não renderiza nada se coverUrl for nulo ou vazio', () => {
    const { container } = render(<KawarpBackground coverUrl={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza o container com proxy de imagem para URL remota', async () => {
    const { container } = render(
      <KawarpBackground coverUrl="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" />
    )
    await waitFor(() => {
      const canvas = container.querySelector('[data-testid="kawarp-canvas"]')
      expect(canvas).toBeInTheDocument()
      expect(canvas?.getAttribute('data-src')).toContain('/api/image-proxy?src=')
      expect(canvas?.getAttribute('data-speed')).toBe('1')
    })
  })

  it('mantém caminhos locais sem alterar', async () => {
    const { container } = render(<KawarpBackground coverUrl="/covers/album.jpg" />)
    await waitFor(() => {
      const canvas = container.querySelector('[data-testid="kawarp-canvas"]')
      expect(canvas).toBeInTheDocument()
      expect(canvas?.getAttribute('data-src')).toBe('/covers/album.jpg')
      expect(canvas?.getAttribute('data-speed')).toBe('1')
    })
  })
})
