import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'

/**
 * Reduced motion **on** for every query — the state the app has to behave
 * correctly in, and the one this machine reports: `SPI_GETCLIENTAREAANIMATION`
 * reads `False`, which is what makes Chrome/Edge answer `reduce`.
 *
 * Two things stand between that preference and the assertions:
 *
 * - `matchMedia` does not exist in jsdom, and Motion refuses to mount without
 *   it. The stub below answers `true` only for the reduced-motion query.
 * - a 2D context, which every lottie-web build asks for *at import time* by
 *   standing up its image proxy — hence the deferred import in each body.
 */
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: /prefers-reduced-motion/.test(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia

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
 * The spinner animates only opacity — its eight bars never move — so the
 * per-frame `opacity` attributes the engine writes are the whole signal. A
 * parked animation writes none of them, which is what makes "did not change"
 * a reliable reading rather than a race.
 */
function sampleOpacities(root: HTMLElement): string {
  const values: string[] = []
  for (const node of root.querySelectorAll('*')) {
    const opacity = (node as SVGElement).getAttribute?.('opacity')
    if (opacity) values.push(opacity)
  }
  return values.join('|')
}

describe('LottieGraphic under prefers-reduced-motion', () => {
  it('keeps a loading spinner travelling, because parked reads as hung', async () => {
    const { default: LottieGraphic } = await import('@/components/ui/Lottie')
    const onReady = vi.fn()
    const { container } = render(
      <LottieGraphic name="spinner" loop essential onReady={onReady} />,
    )

    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1), { timeout: 10000 })

    const first = sampleOpacities(container)
    expect(first).not.toBe('')

    // Retried rather than sampled once, so a slow frame cannot fail this.
    await waitFor(() => expect(sampleOpacities(container)).not.toBe(first), {
      timeout: 5000,
      interval: 50,
    })
  })

  it('parks every other graphic on its resting frame', async () => {
    const { default: LottieGraphic } = await import('@/components/ui/Lottie')
    const onReady = vi.fn()
    const { container } = render(
      <LottieGraphic name="spinner" loop onReady={onReady} />,
    )

    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1), { timeout: 10000 })

    const parked = sampleOpacities(container)
    expect(parked).not.toBe('')
    await new Promise(resolve => setTimeout(resolve, 400))
    expect(sampleOpacities(container)).toBe(parked)
  })
})
