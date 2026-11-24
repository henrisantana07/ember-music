import sharp from 'sharp';
import type { Palette } from './palette-types';

type RGB = { r: number; g: number; b: number };

function rgbToHsl({ r, g, b }: RGB): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const distance = (a: RGB, b: RGB) =>
  Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

/**
 * Recebe os bytes de uma thumbnail e devolve a paleta.
 * Lança erro se a imagem for pequena demais (placeholder do YouTube).
 */
export async function extractPalette(input: Buffer): Promise<Palette> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < 300 || h < 150) throw new Error('thumbnail pequena demais');

  // Thumbnails 4:3 (hq/sd) vêm com tarja preta em cima e embaixo.
  // Recortamos o centro em 16:9 para não contaminar a paleta.
  const targetH = Math.min(h, Math.round((w * 9) / 16));
  const top = Math.max(0, Math.round((h - targetH) / 2));

  const { data } = await sharp(input)
    .extract({ left: 0, top, width: w, height: targetH })
    .resize(32, 32, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Agrupa em "baldes" de 4 bits por canal e pondera por saturação.
  const buckets = new Map<number, { r: number; g: number; b: number; w: number; n: number }>();
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    /* Não descartamos mais preto/branco: capas monocromáticas são válidas e
       antes caíam no fallback de cor inventada. O crop 16:9 acima já tira as
       tarjas do hqdefault, então não é necessário filtrar por luminosidade. */
    const [, s] = rgbToHsl({ r, g, b });
    const weight = 0.5 + s;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, w: 0, n: 0 };
    cur.r += r * weight; cur.g += g * weight; cur.b += b * weight;
    cur.w += weight; cur.n += 1;
    buckets.set(key, cur);
  }

  const ranked = [...buckets.values()]
    .map((v) => ({ rgb: { r: v.r / v.w, g: v.g / v.w, b: v.b / v.w }, score: v.w }))
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) throw new Error('sem cores utilizáveis');

  const first = ranked[0].rgb;
  const second = ranked.find((c) => distance(c.rgb, first) > 80)?.rgb ?? null;

  const [h1, s1, l1] = rgbToHsl(first);
  const isNeutral = s1 < 0.12 || l1 < 0.12;
  const primary = isNeutral
    ? hslToHex(h1, s1, l1)
    : hslToHex(h1, clamp(s1, 0.35, 0.9), clamp(l1, 0.28, 0.5));

  let secondary: string;
  if (second) {
    const [h2, s2, l2] = rgbToHsl(second);
    secondary = s2 < 0.12 || l2 < 0.12
      ? hslToHex(h2, s2, l2)
      : hslToHex(h2, clamp(s2, 0.3, 0.85), clamp(l2, 0.2, 0.42));
  } else if (isNeutral) {
    // monocromático escuro: mantém a escala de cinza, sem matiz inventado
    secondary = hslToHex(0, 0, clamp(l1 + 0.06, 0, 1));
  } else {
    // capa quase monocromática colorida: gira o matiz para criar profundidade
    secondary = hslToHex((h1 + 0.08) % 1, clamp(s1, 0.3, 0.8), 0.22);
  }

  const base = isNeutral
    ? hslToHex(0, 0, Math.min(l1, 0.07))
    : hslToHex(h1, 0.3, 0.07);

  return { primary, secondary, base, isFallback: false };
}
