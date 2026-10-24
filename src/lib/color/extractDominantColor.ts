function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) return null
  const int = parseInt(match[1], 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

export function vibrateColor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const [r8, g8, b8] = rgb
  const r = r8 / 255
  const g = g8 / 255
  const b = b8 / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }

  if (s < 0.12) h = 0.075
  const S = Math.max(s, 0.45)
  const L = Math.max(l, 0.5)
  if (S === s && L === l) return hex

  return hslToHex(h, S, L)
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const toHex = (x: number) => {
    const v = Math.round(x * 255)
    return v.toString(16).padStart(2, '0')
  }
  return `#${toHex(hue2rgb(p, q, h + 1 / 3))}${toHex(hue2rgb(p, q, h))}${toHex(hue2rgb(p, q, h - 1 / 3))}`
}

function extractFromImageSource(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      const width = Math.max(1, Math.floor(w / 2))
      const height = Math.max(1, Math.floor(h / 2))
      const left = Math.floor((w - width) / 2)
      const top = Math.floor((h - height) / 2)
      import('fast-average-color')
        .then(({ FastAverageColor }) =>
          new FastAverageColor().getColorAsync(img, {
            mode: 'precision',
            algorithm: 'dominant',
            left,
            top,
            width,
            height,
          }),
        )
        .then((color) => resolve(vibrateColor(color.hex)))
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
