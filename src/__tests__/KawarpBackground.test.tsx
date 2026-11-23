import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { KawarpBackground } from '@/components/Player/KawarpBackground'

// Espiões da API imperativa do Kawarp. Ficam fora do factory do mock para
// poderem ser inspecionados nos testes.
const kawarpApi = vi.hoisted(() => ({
  loadGradient: vi.fn(),
  loadImage: vi.fn(() => Promise.resolve()),
}))

// Mock do @kawarp/react: o wrapper real (KawarpCanvas) passa um callback ref,
// então o mock precisa honrar `ref` e expor `loadGradient`/`loadImage`.
vi.mock('@kawarp/react', async () => {
  const React = await import('react')

  const Kawarp = React.forwardRef(function MockKawarp(
    { src, className, animationSpeed }: { src?: string; className?: string; animationSpeed?: number },
    ref: React.ForwardedRef<unknown>
  ) {
    React.useImperativeHandle(ref, () => ({
      instance: null,
      loadImage: kawarpApi.loadImage,
      loadBlob: vi.fn(),
      loadGradient: kawarpApi.loadGradient,
      start: vi.fn(),
      stop: vi.fn(),
    }))

    return (
      <div
        data-testid="kawarp-canvas"
        data-src={src}
        data-speed={animationSpeed}
        className={className}
      />
    )
  })

  return { Kawarp }
})

describe('KawarpBackground', () => {
  beforeEach(() => {
    kawarpApi.loadGradient.mockClear()
    kawarpApi.loadImage.mockClear()
  })

  it('não renderiza nada se não houver capa nem paleta', () => {
    const { container } = render(<KawarpBackground coverUrl={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('usa a capa remota pelo proxy de imagem quando não há paleta', async () => {
    const { container } = render(
      <KawarpBackground coverUrl="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" />
    )

    await waitFor(() => {
      expect(container.querySelector('[data-testid="kawarp-canvas"]')).toBeInTheDocument()
      expect(kawarpApi.loadImage).toHaveBeenCalledWith(
        expect.stringContaining('/api/image-proxy?src=')
      )
    })

    expect(container.querySelector('[data-testid="kawarp-canvas"]')?.getAttribute('data-speed')).toBe('1')
    expect(kawarpApi.loadGradient).not.toHaveBeenCalled()
  })

  it('mantém caminhos locais sem alterar', async () => {
    const { container } = render(<KawarpBackground coverUrl="/covers/album.jpg" />)

    await waitFor(() => {
      expect(container.querySelector('[data-testid="kawarp-canvas"]')).toBeInTheDocument()
      expect(kawarpApi.loadImage).toHaveBeenCalledWith('/covers/album.jpg')
    })

    expect(kawarpApi.loadGradient).not.toHaveBeenCalled()
  })

  it('apresenta as cores extraídas no gradiente do Kawarp', async () => {
    const palette = {
      primary: '#e9d75d',
      secondary: '#47ff9f',
      tertiary: '#ff780a',
    }

    const { container } = render(
      <KawarpBackground coverUrl="/covers/album.jpg" palette={palette} />
    )

    await waitFor(() => {
      expect(container.querySelector('[data-testid="kawarp-canvas"]')).toBeInTheDocument()
      expect(kawarpApi.loadGradient).toHaveBeenCalledWith(
        ['#e9d75d', '#47ff9f', '#ff780a'],
        135
      )
    })

    // A capa é só fallback: com paleta, o gradiente é a fonte do canvas.
    expect(kawarpApi.loadImage).not.toHaveBeenCalled()
  })

  it('renderiza o gradiente da paleta mesmo sem capa', async () => {
    const { container } = render(
      <KawarpBackground
        coverUrl={null}
        palette={{ primary: '#112233', secondary: '#445566' }}
      />
    )

    await waitFor(() => {
      expect(kawarpApi.loadGradient).toHaveBeenCalledWith(['#112233', '#445566'], 135)
    })

    expect(container.querySelector('[data-testid="kawarp-canvas"]')).toBeInTheDocument()
  })
})
