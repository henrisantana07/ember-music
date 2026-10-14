import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'

/**
 * Two things jsdom does not ship, both of which stand between the module
 * graph and the animation:
 *
 * - `matchMedia`, which Motion reads to decide whether travel is welcome —
 *   without it the component cannot mount at all.
 * - a 2D context, which every lottie-web build asks for *at import time* by
 *   standing up its image proxy. It runs before any test body, so the stub
 *   has to be in place before the component is imported, which is why the
 *   import below is deferred.
 *
 * `OffscreenCanvas` needs no stub: the one lottie-web asks for sits behind a
 * text-layer branch our animations never enter, and on the svg renderer too.
 */
beforeAll(() => {
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }

  const context = {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    lineWidth: 0,
    fillRect: () => {},
    clearRect: () => {},
    drawImage: () => {},
    putImageData: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    createImageData: () => ({ data: new Uint8ClampedArray(4) }),
    measureText: () => ({ width: 0 }),
  }

  Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
    value: () => context,
    writable: true,
    configurable: true,
  })
})

/**
 * These animations are written by hand rather than exported from After
 * Effects, so what they have to survive is the engine actually parsing them
 * and the colour pass finding something to repaint.
 */
describe('LottieGraphic', () => {
  it('renders a stroke-only animation and paints it with currentColor', async () => {
    const { default: LottieGraphic } = await import('@/components/ui/Lottie')
    const onReady = vi.fn()
    const { container } = render(
      <LottieGraphic name="chevron" loop={false} className="h-6 w-6" onReady={onReady} />,
    )

    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1), { timeout: 10000 })

    const paths = container.querySelectorAll('path')
    expect(paths.length).toBeGreaterThan(0)

    // A stroke-only shape is tagged `fill-opacity: 0`; that fill must stay
    // empty or the open chevron would be drawn shut.
    await waitFor(() => {
      expect(paths[0]!.getAttribute('stroke')).toBe('currentColor')
      expect(paths[0]!.getAttribute('fill-opacity')).toBe('0')
      expect(paths[0]!.getAttribute('fill')).not.toBe('currentColor')
    })
  })

  it('repaints filled shapes without disturbing the strokes beside them', async () => {
    const { default: LottieGraphic } = await import('@/components/ui/Lottie')
    const onReady = vi.fn()
    const { container } = render(
      <LottieGraphic name="record" loop className="h-16 w-16" onReady={onReady} />,
    )

    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1), { timeout: 10000 })

    await waitFor(() => {
      const stroked = container.querySelector('path[stroke="currentColor"]')
      const filled = container.querySelector('path[fill="currentColor"]')

      expect(stroked).not.toBeNull()
      expect(filled).not.toBeNull()
      // Filled shapes keep their own opacity; only the paint is inherited.
      expect(filled!.getAttribute('fill-opacity')).not.toBe('0')
    })
  })

  it('paints the loading spinner in the surrounding colour', async () => {
    const { default: LottieGraphic } = await import('@/components/ui/Lottie')
    const onReady = vi.fn()
    const { container } = render(
      <LottieGraphic name="spinner" loop className="h-10 w-10" onReady={onReady} />,
    )

    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1), { timeout: 10000 })

    await waitFor(() => {
      const paths = container.querySelectorAll('path')
      expect(paths.length).toBeGreaterThan(0)
      for (const path of paths) {
        expect(path.getAttribute('fill')).toBe('currentColor')
      }
    })
  })
})
