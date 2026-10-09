function extractFromImageSource(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      const boxW = Math.max(1, Math.floor(w / 2))
      const boxH = Math.max(1, Math.floor(h / 2))
      const box: [number, number, number, number] = [
        Math.floor((w - boxW) / 2),
        Math.floor((h - boxH) / 2),
        boxW,
        boxH,
      ]
      import('fast-average-color')
        .then(({ FastAverageColor }) =>
          new FastAverageColor().getColorAsync(img, { mode: 'precision', algorithm: 'dominant', box }),
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
