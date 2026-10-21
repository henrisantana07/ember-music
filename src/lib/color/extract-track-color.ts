/**
 * Extração de cor da capa para o hero de reprodução.
 *
 * Pipeline inspirado na skill ember-hero-track-color:
 * 1. Downsample para canvas 100×100 (mantém proporção)
 * 2. K-means determinístico (k=8, 10 iterações)
 * 3. Scoring perceptual: QC×chroma + QD×darkness + QR×dominance
 * 4. Pós-processamento: clamp extremos, ajustar saturação/luminosidade
 * 5. Retorna primary/light/gradient/HSL para o hook consumir
 *
 * Funções puras — sem dependências de React, DOM ou rede.
 */

export interface RGB {
  r: number
  g: number
  b: number
}

export interface TrackHeroColor {
  /** Cor dominante hex (#rrggbb) — usada no gradiente principal. */
  primary: string
  /** Versão mais clara da primary — para detalhes decorativos. */
  light: string
  /** CSS gradient string pronto para uso. */
  gradient: string
  /** HSL da primary (h 0..1, s 0..1, l 0..1). */
  hsl: { h: number; s: number; l: number }
}

/** Centroide de cluster K-means com contagem de pixels. */
interface Cluster {
  centroid: RGB
  count: number
}

/** Constantes do scoring perceptual (fórmula fornecida na skill). */
const QC = 4.9226
const QD = 1.406
const QR = 0.7932

/** Tamanho do canvas de downsample — limita a ~10k pixels. */
const DOWNSAMPLE_MAX = 100

/** K do K-means. */
const K_CLUSTERS = 8

/** Iterações do K-means. */
const KMEANS_ITERATIONS = 10

/**
 * Converte hex para RGB (0..255).
 */
export function hexToRgb(hex: string): RGB | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) return null
  const int = parseInt(match[1], 16)
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

/**
 * Converte RGB (0..255) para HSL (h 0..1, s 0..1, l 0..1).
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return { h, s, l }
}

/**
 * Converte HSL (h 0..1, s 0..1, l 0..1) para hex.
 */
export function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
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
 * Distância euclidiana quadrada entre dois RGB (evita sqrt no loop interno).
 */
function rgbDist2(a: RGB, b: RGB): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return dr * dr + dg * dg + db * db
}

/**
 * Inicialização K-means++ determinística (semente fixa por imagem).
 * Retorna índices dos centroides iniciais no array de pixels.
 */
function kmeansPlusPlusInit(pixels: RGB[], k: number, seed: number): number[] {
  const indices: number[] = []
  // PRNG simples determinístico (mulberry32)
  let state = seed >>> 0
  const rand = () => {
    state += 0x6d2b79f5
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // Primeiro centroide: aleatório determinístico
  indices.push(Math.floor(rand() * pixels.length))

  // Demais: probabilidade proporcional à distância quadrada do centroide mais próximo
  const dist2 = new Float32Array(pixels.length).fill(Infinity)

  for (let ci = 1; ci < k; ci++) {
    const lastCentroid = pixels[indices[ci - 1]]
    let totalWeight = 0
    for (let i = 0; i < pixels.length; i++) {
      const d2 = rgbDist2(pixels[i], lastCentroid)
      if (d2 < dist2[i]) dist2[i] = d2
      totalWeight += dist2[i]
    }
    if (totalWeight === 0) {
      // Todos pixels idênticos — preenche com o primeiro
      indices.push(0)
      continue
    }
    let target = rand() * totalWeight
    let chosen = 0
    for (let i = 0; i < pixels.length; i++) {
      target -= dist2[i]
      if (target <= 0) {
        chosen = i
        break
      }
    }
    indices.push(chosen)
  }
  return indices
}

/**
 * Executa K-means determinístico sobre pixels RGB.
 * Retorna clusters com centroides finais e contagens.
 */
function runKmeans(pixels: RGB[], k: number, seed: number): Cluster[] {
  const initIndices = kmeansPlusPlusInit(pixels, k, seed)
  const centroids: RGB[] = initIndices.map((i) => pixels[i])
  const assignments = new Uint32Array(pixels.length)

  for (let iter = 0; iter < KMEANS_ITERATIONS; iter++) {
    // Atribuição: cada pixel vai pro centroide mais próximo
    for (let i = 0; i < pixels.length; i++) {
      let bestIdx = 0
      let bestDist = Infinity
      const px = pixels[i]
      for (let c = 0; c < k; c++) {
        const d2 = rgbDist2(px, centroids[c])
        if (d2 < bestDist) {
          bestDist = d2
          bestIdx = c
        }
      }
      assignments[i] = bestIdx
    }

    // Atualização: novo centroide = média dos pixels atribuídos
    const newCentroids: RGB[] = Array.from({ length: k }, () => ({ r: 0, g: 0, b: 0 }))
    const counts = new Uint32Array(k).fill(0)

    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i]
      const px = pixels[i]
      newCentroids[c].r += px.r
      newCentroids[c].g += px.g
      newCentroids[c].b += px.b
      counts[c]++
    }

    let converged = true
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) {
        // Cluster vazio: mantém centroide anterior (evita NaN)
        newCentroids[c] = centroids[c]
        continue
      }
      newCentroids[c].r = Math.round(newCentroids[c].r / counts[c])
      newCentroids[c].g = Math.round(newCentroids[c].g / counts[c])
      newCentroids[c].b = Math.round(newCentroids[c].b / counts[c])

      // Checa convergência
      const dr = newCentroids[c].r - centroids[c].r
      const dg = newCentroids[c].g - centroids[c].g
      const db = newCentroids[c].b - centroids[c].b
      if (dr * dr + dg * dg + db * db > 1) converged = false
    }

    // Copia de volta
    for (let c = 0; c < k; c++) {
      centroids[c] = newCentroids[c]
    }
    if (converged) break
  }

  // Contagem final por cluster
  const finalCounts = new Uint32Array(k).fill(0)
  for (let i = 0; i < pixels.length; i++) finalCounts[assignments[i]]++

  return centroids.map((centroid, i) => ({
    centroid,
    count: finalCounts[i],
  }))
}

/**
 * Calcula chroma (diferença de cor) para RGB normalizado 0..1.
 * Fórmula da skill: sqrt((r-g)² + (((r+g)/2)-b)²)
 */
export function chroma(r: number, g: number, b: number): number {
  const rg = r - g
  const yb = (r + g) * 0.5 - b
  return Math.sqrt(rg * rg + yb * yb)
}

/**
 * Calcula luminância perceptual (fórmula da skill, NÃO WCAG).
 * sqrt(0.299*r² + 0.587*g² + 0.114*b²) com r,g,b em 0..1.
 */
export function luminanceSkill(r: number, g: number, b: number): number {
  return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b)
}

/**
 * Pontua um cluster para escolha da cor dominante.
 * `count`/`totalPixels` dão a dominância; os pesos QC/QD/QR vêm da skill.
 */
export function scoreCluster(centroid: RGB, count: number, totalPixels: number): number {
  const rn = centroid.r / 255
  const gn = centroid.g / 255
  const bn = centroid.b / 255
  const chr = chroma(rn, gn, bn)
  const lum = luminanceSkill(rn, gn, bn)
  /* Guarda contra totalPixels=0 para não virar Infinity/NaN quando chamado fora do loop. */
  const dominance = totalPixels > 0 ? count / totalPixels : 0
  return QC * chr + QD * (1 - lum) + QR * dominance
}

/**
 * Pós-processa a cor vencedora: evita preto/branco puros, ajusta saturação/luminosidade
 * moderadamente, preserva matiz quando possível.
 */
function postProcessColor(rgb: RGB): RGB {
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)

  // Se quase preto (l < 0.05) ou quase branco (l > 0.95), puxa pro cinza médio mantendo matiz
  // mas se saturação muito baixa, força um matiz neutro (evita cor arbitrária).
  let newL = l
  let newS = s
  const newH = h

  if (l < 0.05) {
    newL = 0.15 // tira do preto puro
    newS = Math.max(s, 0.3) // garante alguma cor
  } else if (l > 0.95) {
    newL = 0.85 // tira do branco puro
    newS = Math.max(s, 0.2)
  }

  // Clamp saturação: não deixa explodir, mas garante mínimo pra ler no gradiente escuro
  newS = Math.min(Math.max(newS, 0.35), 0.85)
  // Clamp luminosidade: faixa que lê bem sobre fundo escuro (hero é dark)
  newL = Math.min(Math.max(newL, 0.35), 0.65)

  // Converte de volta
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS
  const p = 2 * newL - q
  const r = Math.round(hue2rgb(p, q, newH + 1 / 3) * 255)
  const g = Math.round(hue2rgb(p, q, newH) * 255)
  const b = Math.round(hue2rgb(p, q, newH - 1 / 3) * 255)
  return { r, g, b }
}

/**
 * Cria versão "light" da cor (para detalhes) — sobe luminosidade, baixa saturação.
 */
function makeLightVariant(rgb: RGB): RGB {
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const newL = Math.min(l + 0.25, 0.8)
  const newS = Math.max(s * 0.6, 0.2)
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS
  const p = 2 * newL - q
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
  const g = Math.round(hue2rgb(p, q, h) * 255)
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  return { r, g, b }
}

/**
 * Gera CSS gradient string: radial no canto superior-esquerdo → surface escuro.
 * Segue padrão M3 dark: cor da capa no topo, transição pro --bg-base (preto puro).
 */
function buildGradient(primaryHex: string): string {
  // radial-gradient(ellipse at 28% 18%, primary 0%, primary@60% 30%, primary@35% 50%, var(--bg-base) 78%)
  // Usa color-mix via CSS variables no consumidor; aqui retorna string com alphas fixos.
  return `radial-gradient(ellipse at 28% 18%, ${primaryHex}F2 0%, ${primaryHex}99 30%, ${primaryHex}59 50%, var(--bg-base) 78%)`
}

/**
 * Função principal: extrai TrackHeroColor de um HTMLImageElement já carregado.
 * Usa canvas 2D para downsample + K-means + scoring.
 */
export function extractTrackHeroColorFromImage(img: HTMLImageElement): TrackHeroColor | null {
  // 1. Cria canvas de downsample (máx 100×100, mantém proporção)
  const scale = Math.min(DOWNSAMPLE_MAX / img.naturalWidth, DOWNSAMPLE_MAX / img.naturalHeight, 1)
  const cw = Math.max(1, Math.round(img.naturalWidth * scale))
  const ch = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.drawImage(img, 0, 0, cw, ch)

  // 2. Lê pixels (ImageData -> Uint8ClampedArray)
  let imageData: ImageData
  try {
    imageData = ctx.getImageData(0, 0, cw, ch)
  } catch {
    // Canvas contaminado (CORS) — sinaliza pro caller tentar proxy
    return null
  }

  const data = imageData.data
  const pixelCount = cw * ch

  // 3. Converte para array de RGB (ignora transparentes — capas não têm alpha, mas seguro)
  const pixels: RGB[] = new Array(pixelCount)
  let validCount = 0
  for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
    const alpha = data[j + 3]
    if (alpha === 0) continue // totalmente transparente
    // Quase transparente (alpha < 10) — ignora também
    if (alpha < 10) continue
    pixels[validCount++] = { r: data[j], g: data[j + 1], b: data[j + 2] }
  }
  if (validCount === 0) return null
  pixels.length = validCount

  // 4. Semente determinística baseada nos pixels (hash simples)
  let seed = 0
  for (let i = 0; i < Math.min(validCount, 256); i++) {
    seed = (seed * 31 + pixels[i].r * 7 + pixels[i].g * 13 + pixels[i].b * 17) >>> 0
  }

  // 5. K-means
  const clusters = runKmeans(pixels, K_CLUSTERS, seed)

  // 6. Scoring perceptual por cluster
  let bestCluster: Cluster | null = null
  let bestScore = -Infinity
  const totalPixels = validCount

  for (const cluster of clusters) {
    if (cluster.count === 0) continue
    const score = scoreCluster(cluster.centroid, cluster.count, totalPixels)
    if (score > bestScore) {
      bestScore = score
      bestCluster = cluster
    }
  }

  if (!bestCluster) return null

  // 7. Pós-processa a cor vencedora
  const processed = postProcessColor(bestCluster.centroid)
  const primaryHex = `#${processed.r.toString(16).padStart(2, '0')}${processed.g.toString(16).padStart(2, '0')}${processed.b.toString(16).padStart(2, '0')}`
  const lightRgb = makeLightVariant(processed)
  const lightHex = `#${lightRgb.r.toString(16).padStart(2, '0')}${lightRgb.g.toString(16).padStart(2, '0')}${lightRgb.b.toString(16).padStart(2, '0')}`
  const hsl = rgbToHsl(processed.r, processed.g, processed.b)
  const gradient = buildGradient(primaryHex)

  return { primary: primaryHex, light: lightHex, gradient, hsl }
}

/**
 * Carrega imagem com crossOrigin, tenta direto, cai no proxy se falhar.
 * Retorna HTMLImageElement ou null.
 */
export async function loadImageForExtraction(
  src: string
): Promise<HTMLImageElement | null> {
  // Tentativa direta com crossOrigin
  const direct = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
  if (direct && direct.naturalWidth > 0 && direct.naturalHeight > 0) {
    return direct
  }

  // Fallback: proxy (mesmo endpoint existente)
  const proxySrc = `/api/image-proxy?src=${encodeURIComponent(src)}`
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = proxySrc
  })
}

/**
 * Extração completa: carrega imagem + extrai cor.
 * Retorna TrackHeroColor ou null se tudo falhar.
 */
export async function extractTrackHeroColor(
  src: string | null | undefined
): Promise<TrackHeroColor | null> {
  if (!src || typeof Image === 'undefined' || typeof document === 'undefined') {
    return null
  }

  const img = await loadImageForExtraction(src)
  if (!img || img.naturalWidth < 2 || img.naturalHeight < 2) {
    return null
  }

  return extractTrackHeroColorFromImage(img)
}