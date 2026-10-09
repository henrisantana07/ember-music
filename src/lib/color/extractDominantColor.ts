function extractFromImageSource(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      import('fast-average-color')
        .then(({ FastAverageColor }) =>
          new FastAverageColor().getColorAsync(img, { mode: 'precision', algorithm: 'dominant' }),
        )
        .then((color) => resolve(color.hex))
        .catch(() => resolve(null))
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export async function extractDominantColor(src: string | null | undefined): Promise<string | null> {
  if (!src) return null

  const direct = await extractFromImageSource(src)
  if (direct) return direct

  return extractFromImageSource(`/api/image-proxy?src=${encodeURIComponent(src)}`)
}
