import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { KawarpBackground, KAWARP_DEFAULTS } from '@/components/Player/KawarpBackground'

// Espiões da API imperativa do Kawarp. Ficam fora do factory do mock para
// poderem ser inspecionados nos testes.
const kawarpApi = vi.hoisted(() => ({
  loadGradient: vi.fn(),
  loadImage: vi.fn(() => Promise.resolve()),
  start: vi.fn(),
}))

// Mock do @kawarp/react: o wrapper real (KawarpCanvas) passa um callback ref,
// então o mock precisa honrar `ref` e expor `loadGradient`/`loadImage`.
vi.mock('@kawarp/react', async () => {
  const React = await import('react')

  const Kawarp = React.forwardRef(function MockKawarp(
    { src, className, animationSpeed }: { src?: string; className?: string; animationSpeed?: number },
    ref: React.ForwardedRef<unknown>
  ) {
    /* O handle do @kawarp/react é entregue no layout effect, mas o núcleo
       WebGL só existe depois do useEffect. O mock reproduz essa janela para
       garantir que o KawarpBackground espere e tente de novo. */
    const coreRef = React.useRef<unknown>(null)
    React.useEffect(() => {
      coreRef.current = {}
    }, [])

    React.useImperativeHandle(ref, () => ({
      get instance() {
        return coreRef.current
      },
      loadImage: kawarpApi.loadImage,
      loadBlob: vi.fn(),
      loadGradient: kawarpApi.loadGradient,
      start: kawarpApi.start,
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
    kawarpApi.loadImage.mockReset()
    kawarpApi.loadImage.mockResolvedValue(undefined)
    kawarpApi.start.mockClear()
  })

  it('mantém as configurações de Warp/Blur/Speed/Transition/etc. desejadas', () => {
    expect(KAWARP_DEFAULTS).toEqual({
      warpIntensity: 1.0,
      blurPasses: 8,
      animationSpeed: 1.0,
      transitionDuration: 1000,
      saturation: 1.5,
      tintIntensity: 0.15,
      dithering: 0.008,
      scale: 1.0,
    })
  })

  it('ainda renderiza o gradiente padrão sem capa nem paleta', async () => {
    const { container } = render(<KawarpBackground coverUrl={null} />)

    await waitFor(() => {
      expect(container.querySelector('[data-testid="kawarp-canvas"]')).toBeInTheDocument()
      expect(kawarpApi.loadGradient).toHaveBeenCalledWith(
        ['#ff6a00', '#3b2a5a'],
        135
      )
    })
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

  it('usa a imagem da capa como textura mesmo quando há paleta', async () => {
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
      expect(kawarpApi.loadImage).toHaveBeenCalledWith('/covers/album.jpg')
    })

    // A paleta é só do CSS/fallback: o Kawarp amostra a imagem, não as cores.
    expect(kawarpApi.loadGradient).not.toHaveBeenCalled()
    expect(kawarpApi.start).toHaveBeenCalled()
  })

  it('só usa o gradiente da paleta quando a capa falha', async () => {
    const palette = {
      primary: '#e9d75d',
      secondary: '#47ff9f',
      tertiary: '#ff780a',
    }
    kawarpApi.loadImage.mockRejectedValueOnce(new Error('404'))

    render(<KawarpBackground coverUrl="/covers/inexistente.jpg" palette={palette} />)

    await waitFor(() => {
      expect(kawarpApi.loadImage).toHaveBeenCalledWith('/covers/inexistente.jpg')
      expect(kawarpApi.loadGradient).toHaveBeenCalledWith(
        ['#e9d75d', '#47ff9f', '#ff780a'],
        135
      )
    })
    expect(kawarpApi.start).toHaveBeenCalled()
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
