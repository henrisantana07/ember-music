# Ember Music: Background com gradiente estático na Hero de reprodução

Guia de implementação do fundo em gradiente estático gerado a partir da capa (thumbnail do YouTube) da faixa que está tocando.

Stack alvo: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Vitest.

---

## 1. Método escolhido

**Extrair as cores no servidor (Route Handler) e desenhar o gradiente com CSS puro no cliente.**

| Alternativa | Por que NÃO usar |
| --- | --- |
| Ler a imagem no cliente com `<canvas>` + `getImageData` | Se o servidor da thumbnail não enviar cabeçalhos CORS, o canvas fica "tainted" e `getImageData` lança erro. É a causa mais comum de falha. |
| Kawarp / WebGL | É animado (não estático), depende de WebGL e de a textura carregar via CORS. Mais pontos de falha. |
| Biblioteca de paleta no cliente (ex.: color-thief) | Mesmo problema de CORS do canvas. |

**Por que o método do servidor tem mais chance de dar certo:**
- Nenhuma dependência de CORS: o navegador nunca lê pixels da thumbnail, só recebe 3 strings de cor em JSON.
- Zero WebGL: funciona em qualquer navegador e no WebView do app.
- Cacheável: o resultado de cada vídeo é calculado uma vez e reutilizado.
- A chave da YouTube Data API **não** é necessária neste fluxo, então nunca vai parar no cliente.

---

## 2. Fluxo

```
Hero (videoId)
   │
   ├─ useCoverPalette(videoId) ──► GET /api/cover-palette/{videoId}
   │                                   │
   │                                   ├─ busca thumbnail (maxres → sd → hq → mq)
   │                                   ├─ recorta tarjas pretas (força 16:9)
   │                                   ├─ reduz para 32x32 e agrupa cores
   │                                   └─ devolve { primary, secondary, base }
   │
   └─ <HeroBackground> monta o gradiente CSS e faz crossfade ao trocar de faixa
```

---

## 3. Instalação

```bash
npm install sharp
```

`sharp` roda só em Node. A rota abaixo declara `runtime = 'nodejs'` (não use Edge runtime).

---

## 4. Arquivos

### 4.1 `lib/palette-types.ts` (seguro para importar no cliente)

```ts
export type Palette = {
  primary: string;   // cor principal (hex)
  secondary: string; // cor de apoio (hex)
  base: string;      // fundo escuro derivado (hex)
  isFallback: boolean;
};

export const FALLBACK_PALETTE: Palette = {
  primary: '#3b2a5a',
  secondary: '#1f3a5f',
  base: '#0b0b12',
  isFallback: true,
};
```

### 4.2 `lib/palette.ts` (somente servidor)

```ts
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
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max < 24 || min > 235) continue; // ignora quase preto / quase branco
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
  const primary = hslToHex(h1, clamp(s1, 0.35, 0.9), clamp(l1, 0.28, 0.5));

  let secondary: string;
  if (second) {
    const [h2, s2, l2] = rgbToHsl(second);
    secondary = hslToHex(h2, clamp(s2, 0.3, 0.85), clamp(l2, 0.2, 0.42));
  } else {
    // capa quase monocromática: gira o matiz para criar profundidade
    secondary = hslToHex((h1 + 0.08) % 1, clamp(s1, 0.3, 0.8), 0.22);
  }

  const base = hslToHex(h1, 0.3, 0.07);

  return { primary, secondary, base, isFallback: false };
}
```

> A normalização de luminosidade (`l` entre 0.2 e 0.5) garante que o texto branco da Hero continue legível, mesmo com capas muito claras.

### 4.3 `app/api/cover-palette/[videoId]/route.ts`

```ts
import { NextResponse } from 'next/server';
import { extractPalette } from '@/lib/palette';
import { FALLBACK_PALETTE } from '@/lib/palette-types';

export const runtime = 'nodejs';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const SIZES = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'] as const;

async function paletteFromYouTube(id: string) {
  for (const size of SIZES) {
    try {
      const res = await fetch(`https://i.ytimg.com/vi/${id}/${size}.jpg`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      return await extractPalette(buf); // lança se for placeholder
    } catch {
      continue; // tenta o próximo tamanho
    }
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;

  // Validação estrita: evita SSRF e requisições inúteis.
  if (!VIDEO_ID.test(videoId)) {
    return NextResponse.json(FALLBACK_PALETTE, { status: 400 });
  }

  const palette = await paletteFromYouTube(videoId);

  if (!palette) {
    return NextResponse.json(FALLBACK_PALETTE, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }

  return NextResponse.json(palette, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
```

Pontos de segurança/robustez:
- `videoId` validado por regex antes de montar a URL (o host é fixo: `i.ytimg.com`).
- Timeout de 4 s por tentativa.
- Sempre responde com uma paleta válida (fallback), então a Hero nunca quebra.
- Cadeia de tamanhos: se `maxresdefault` não existir (404) ou vier como placeholder pequeno, tenta o próximo.

### 4.4 `hooks/useCoverPalette.ts`

```ts
'use client';
import { useEffect, useState } from 'react';
import { FALLBACK_PALETTE, type Palette } from '@/lib/palette-types';

export function useCoverPalette(videoId?: string | null): Palette {
  const [palette, setPalette] = useState<Palette>(FALLBACK_PALETTE);

  useEffect(() => {
    if (!videoId) {
      setPalette(FALLBACK_PALETTE);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/cover-palette/${videoId}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('palette'))))
      .then((p: Palette) => setPalette(p))
      .catch(() => {
        /* mantém a paleta anterior ou o fallback */
      });
    return () => controller.abort();
  }, [videoId]);

  return palette;
}
```

### 4.5 `components/player/HeroBackground.tsx`

CSS não anima `background` com gradientes, então o crossfade usa **duas camadas** alternando `opacity`.

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useCoverPalette } from '@/hooks/useCoverPalette';
import type { Palette } from '@/lib/palette-types';

const toGradient = (p: Palette) =>
  [
    `radial-gradient(120% 90% at 15% 0%, ${p.primary} 0%, transparent 60%)`,
    `radial-gradient(110% 90% at 100% 100%, ${p.secondary} 0%, transparent 60%)`,
    `linear-gradient(180deg, ${p.base} 0%, #050505 100%)`,
  ].join(', ');

export function HeroBackground({ videoId }: { videoId?: string | null }) {
  const palette = useCoverPalette(videoId);
  const [slots, setSlots] = useState<[string, string]>(() => [
    toGradient(palette),
    toGradient(palette),
  ]);
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);

  useEffect(() => {
    const back = 1 - frontRef.current;
    setSlots((s) => {
      const next: [string, string] = [s[0], s[1]];
      next[back] = toGradient(palette);
      return next;
    });
    frontRef.current = back;
    setFront(back);
  }, [palette]);

  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {slots.map((background, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none"
          style={{ background, opacity: front === i ? 1 : 0 }}
        />
      ))}
      {/* escurece levemente para garantir contraste do texto */}
      <div className="absolute inset-0 bg-black/25" />
    </div>
  );
}
```

Uso na Hero (o container pai precisa de `relative`):

```tsx
<section className="relative min-h-dvh text-white">
  <HeroBackground videoId={currentTrack?.videoId} />
  {/* capa, título, controles... */}
</section>
```

---

## 5. Teste (Vitest)

`lib/palette.test.ts`

```ts
import sharp from 'sharp';
import { describe, it, expect } from 'vitest';
import { extractPalette } from './palette';

const solid = (r: number, g: number, b: number, w = 640, h = 360) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r, g, b } } })
    .jpeg()
    .toBuffer();

describe('extractPalette', () => {
  it('devolve hex válidos para uma capa colorida', async () => {
    const p = await extractPalette(await solid(220, 30, 30));
    expect(p.primary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.secondary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.isFallback).toBe(false);
  });

  it('rejeita placeholder pequeno', async () => {
    await expect(extractPalette(await solid(128, 128, 128, 120, 90))).rejects.toThrow();
  });
});
```

---

## 6. Checklist de validação

1. `curl http://localhost:3000/api/cover-palette/dQw4w9WgXcQ` retorna JSON com `isFallback: false`.
2. `curl http://localhost:3000/api/cover-palette/invalido` retorna 400 com a paleta de fallback.
3. Trocar de faixa na Hero faz o fundo mudar com crossfade de ~700 ms.
4. Desligar a internet do servidor ou usar um `videoId` inexistente mantém a Hero funcionando com o fallback.
5. Texto branco legível em capas muito claras e muito escuras.
6. Build de produção na Vercel (`next build`) passa sem avisos sobre `sharp`.

---

## 7. Problemas comuns

| Sintoma | Causa provável | Correção |
| --- | --- | --- |
| Sempre `isFallback: true` | Servidor sem acesso a `i.ytimg.com` ou `sharp` não instalado | Rodar `npm install sharp`; testar `curl` da thumbnail no mesmo ambiente |
| Erro de `sharp` no deploy | Rota rodando em Edge runtime | Manter `export const runtime = 'nodejs'` |
| Fundo muito escuro/apagado | Capa com muito preto | Subir o limite inferior de luminosidade em `clamp(l1, 0.28, 0.5)` |
| Fundo muito parecido em todas as faixas | Capas com cor dominante igual | Aumentar o raio do gradiente ou o contraste entre `primary` e `secondary` |
| Fundo "pisca" ao trocar de faixa | Hero remontando o componente | Manter `HeroBackground` montado e só trocar o `videoId` |

---

## 8. Observações

- **Termos do YouTube:** os termos da API do YouTube exigem que o player embutido fique visível. Se a reprodução vier do YouTube, confirme nos termos oficiais se a Hero com fundo em gradiente respeita essa regra. Não validei isso aqui.
- **Alternativa com a API v3:** em vez de montar a URL pelo `videoId`, você pode usar `snippet.thumbnails` da resposta de `videos.list` e enviar essa URL ao servidor. Se fizer isso, aceite apenas o host `i.ytimg.com` e envie a URL por POST ou query validada (nunca fetch de URL arbitrária).
- **App Android (Expo):** o mesmo endpoint `/api/cover-palette/{videoId}` serve ao app. No React Native, use `expo-linear-gradient` com as três cores devolvidas.
