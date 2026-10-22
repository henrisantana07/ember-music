import { FastAverageColor } from 'fast-average-color'
import { extractDominantColor } from './extractDominantColor'

export interface CoverPalette {
  /** Cor predominante #1 (mais "viva" das células amostradas). */
  primary: string
  /** Cor predominante #2 — com matiz distinto, dá profundidade ao gradiente. */
  secondary: string
  /** Cor predominante #3 — contorno/terceira faixa do gradiente. */
  tertiary: string
}

export interface PaletteOptions {
  /**
   * Percentual da altura da imagem que é descartado em cima e embaixo antes de
   * amostrar. `hqdefault` (480x360) tem barras pretas de 45px em cima e embaixo
   * (o vídeo ocupa só as 270px do meio): 0.125 remove exatamente as barras, e
   * 0.15 dá uma folga em cima disso. `maxresdefault` não tem barras — o corte
   * ali só evita que a borda da arte puxe uma cor de contorno.
   * Passe 0 para amostrar a imagem inteira.
   */
  cropY?: number
  /** Lado da grade de amostragem (3 = 9 células). */
  grid?: number
  /** Alvo de saturação para a cor primária (0..1). */
  primarySaturation?: number
  /** Alvo de saturação para as demais cores (0..1). */
  secondarySaturation?: number
  /** Faixa de luminosidade forçada (min..max, 0..1). */
  lightnessRange?: [number, number]
}

const fac = new FastAverageColor()

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) return null
  const int = parseInt(match[1], 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function rgbToHsl(r8: number, g8: number, b8: number): [number, number, number] {
  const r = r8 / 255
  const g = g8 / 255
  const b = b8 / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = l
    g = l
    b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (x: number) => {
    const v = Math.round(Math.min(1, Math.max(0, x)) * 255)
    return v.toString(16).padStart(2, '0')
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Força a saturação alvo e mantém a luminosidade dentro de uma faixa.
 * `vibrateColor` (de `extractDominantColor`) tem alvos fixos em 0.45/0.5 e é o
 * usado pelas páginas de playlist/álbum/biblioteca — este aqui é só da hero.
 */
function normalizeHex(
  hex: string,
  targetSaturation: number,
  lightnessRange: [number, number]
): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2])
  const clamped = (v: number) => Math.min(1, Math.max(0, v))
  return hslToHex(
    h,
    clamped(Math.max(s, targetSaturation)),
    clamped(Math.min(Math.max(l, lightnessRange[0]), lightnessRange[1]))
  )
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b)
  return Math.min(d, 1 - d)
}

export interface PaletteCell {
  /** Matiz em 0..1 */
  h: number
  /** Saturação em 0..1 */
  s: number
  /** Luminosidade em 0..1 */
  l: number
  /** Cor original da célula, em hex */
  hex: string
}

/**
 * Ordena as células amostradas por predominância na arte.
 *
 * `coverage` pesa 2x a saturação de propósito: uma cor que cobre metade da
 * capa descreve a arte melhor do que um detalhe pequeno e saturado, mas uma
 * capa cinzento-com-um-toque-de-cor ainda precisa que o toque vença. O
 * desempate por luminosidade puxa pro miolo da escala (nem fundo, nem
 * blowout), que é o que se lê bem por baixo de um gradiente.
 */
export function rankPaletteCells(cells: readonly PaletteCell[]): readonly PaletteCell[] {
  const score = (cell: PaletteCell) => {
    const coverage = cells.reduce(
      (acc, other) =>
        acc +
        (hueDistance(cell.h, other.h) < 0.12 &&
        Math.abs(cell.s - other.s) < 0.25 &&
        Math.abs(cell.l - other.l) < 0.25
          ? 1
          : 0),
      0
    )
    return coverage * 2 + cell.s - Math.abs(cell.l - 0.55)
  }
  return [...cells].sort((a, b) => score(b) - score(a))
}

/**
 * Escolhe `secondary`/`tertiary` com matiz distinto da primary.
 *
 * `first` é tratado por referência (`c !== first`), não por valor: as duas
 * células vindas do fallback monocromático podem ter o mesmo `hex` e ainda
 * assim precisam ser contadas como a mesma posição da grade.
 *
 * Sem secondary não há tertiary — os dois guards são encadeados de propósito.
 * Deixar o tertiary cair na primary é o caso monocromático, e a quem chama
 * cabe decidir o que fazer com a repetição.
 */
export function pickDistinctHues(
  ranked: readonly PaletteCell[]
): { secondary?: PaletteCell; tertiary?: PaletteCell } {
  const first = ranked[0]
  if (!first) return {}

  const secondary = ranked.find((c) => c !== first && hueDistance(c.h, first.h) > 0.08)
  if (!secondary) return {}

  const tertiary = ranked.find(
    (c) => c !== first && c !== secondary && hueDistance(c.h, first.h) > 0.05 && hueDistance(c.h, secondary.h) > 0.05
  )
  return { secondary, tertiary }
}

function loadHtmlImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

async function loadForSampling(
  src: string,
  crossOrigin: string | null
): Promise<HTMLImageElement | null> {
  if (!crossOrigin) {
    const img = new Image()
    img.src = src
    try {
      await img.decode()
      return img
    } catch {
      return null
    }
  }
  return loadHtmlImage(src)
}

/**
 * Amostra uma grade e devolve as células que interessam (descarta barras,
 * preto/branco extremo e cinza neutro).
 *
 * Não deduplica células parecidas de propósito: é a repetição que alimenta o
 * `coverage` do `rankPaletteCells`. Uma capa azul de fundo devolve nove
 * células azuis e o azul vence por área, não por acaso.
 */
function sampleGrid(img: HTMLImageElement, grid: number, cropY: number): PaletteCell[] {
  const cellH = Math.max(1, Math.floor(img.naturalHeight / grid))
  const cellW = Math.max(1, Math.floor(img.naturalWidth / grid))
  const topPad = Math.floor(img.naturalHeight * cropY)
  const out: PaletteCell[] = []

  for (let row = 0; row < grid; row += 1) {
    for (let col = 0; col < grid; col += 1) {
      const left = col * cellW
      let top = row * cellH
      const height = Math.min(cellH, img.naturalHeight - top)
      // Recorta a barra superior/inferior de letterbox.
      if (row === 0 && topPad > 0) {
        top += topPad
      }
      const h = Math.max(1, height - (row === 0 ? topPad : row === grid - 1 ? topPad : 0))
      if (h <= 1 || cellW <= 1) continue

      let hex: string
      try {
        hex = fac.getColor(img, {
          left,
          top,
          width: cellW,
          height: h,
          algorithm: 'dominant',
          mode: 'precision',
          silent: true,
        }).hex
      } catch {
        continue
      }

      const rgb = hexToRgb(hex)
      if (!rgb) continue
      const [hue, sat, lig] = rgbToHsl(rgb[0], rgb[1], rgb[2])
      // Remove letterbox (quase preto) e realces/áreas lavadas (quase branco).
      if (lig < 0.1 || lig > 0.92) continue
      // Remove cinzas neutros: não carregam matiz pro gradiente.
      if (sat < 0.12) continue

      out.push({ h: hue, s: sat, l: lig, hex })
    }
  }

  return out
}

/**
 * Extrai as cores mais predominantes da capa para o gradiente da hero.
 *
 * Amostra a imagem em grade (padrão 3x3 = 9 células), descarta as células de
 * letterbox/preto/branco/cinza e escolhe as cores com matiz mais distinto.
 * A cor primária usa os alvos mais saturados — é ela que puxa a intensidade.
 *
 * Se a imagem não puder ser lida (CORS, 404), cai no `extractDominantColor` de
 * sempre, então o retorno só é `null` quando não há cor nenhuma.
 */
export async function extractCoverPalette(
  src: string | null | undefined,
  options: PaletteOptions = {}
): Promise<CoverPalette | null> {
  if (!src || typeof Image === 'undefined') return null

  const {
    cropY = 0.15,
    grid = 3,
    primarySaturation = 0.72,
    secondarySaturation = 0.55,
    lightnessRange = [0.44, 0.58],
  } = options

  const direct = await loadForSampling(src, 'anonymous')
  const img =
    direct && direct.naturalWidth > 0 && direct.naturalHeight > 0
      ? direct
      : await loadForSampling(`/api/image-proxy?src=${encodeURIComponent(src)}`, null)

  if (!img || img.naturalWidth < 2 || img.naturalHeight < 2) {
    const fallback = await extractDominantColor(src)
    return fallback ? { primary: fallback, secondary: fallback, tertiary: fallback } : null
  }

  const cells = sampleGrid(img, grid, cropY)
  if (cells.length === 0) {
    const fallback = await extractDominantColor(src)
    return fallback ? { primary: fallback, secondary: fallback, tertiary: fallback } : null
  }

  const ranked = rankPaletteCells(cells)
  const first = ranked[0]
  const primary = normalizeHex(first.hex, primarySaturation, lightnessRange)

  // Sem matiz distinto (capa monocromática) secondary/tertiary caem na primary:
  // vira um radial de uma cor só, que é o que já existia antes da paleta.
  const { secondary: secondaryCell, tertiary: tertiaryCell } = pickDistinctHues(ranked)
  const secondary = normalizeHex(
    (secondaryCell ?? first).hex,
    secondarySaturation,
    lightnessRange
  )
  const tertiary = normalizeHex(
    (tertiaryCell ?? secondaryCell ?? first).hex,
    secondarySaturation,
    lightnessRange
  )

  return { primary, secondary, tertiary }
}
