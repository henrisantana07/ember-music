# Ember Music — Fundo estático na Hero de Reprodução com Kawarp (capa via YouTube Data API v3)

Stack alvo: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.
Biblioteca: **Kawarp** (`@kawarp/core`), open source, licença **MIT**, zero dependências — https://github.com/better-lyrics/kawarp

## 1. Método escolhido e por quê

**Renderizar um quadro estático do Kawarp no servidor (módulo `@kawarp/core/frame`) a partir da capa e entregá-lo como imagem; no cliente é só `background-image`.**

O README do Kawarp documenta `@kawarp/core/frame`: ele desenha **um quadro na CPU, sem WebGL**, pensado para servidores e etapas de build, e aceita pixels RGBA de qualquer tamanho. Isso dá o efeito Kawarp (blur Kawase + domain warping) como **gradiente estático**.

| Alternativa | Problema |
|---|---|
| Kawarp WebGL no cliente com a URL do YouTube | Textura cross-origin: depende de CORS de `i.ytimg.com`, que não verifiquei. Também exige WebGL e é animado. |
| Canvas no navegador para ler cores | Mesmo risco de CORS (canvas "tainted"). |
| **Quadro Kawarp renderizado no servidor** | **Sem CORS, sem WebGL, sem custo de GPU no cliente, cacheável na CDN.** |

Decisões que reduzem a chance de erro:
- Usar a thumbnail **`mqdefault` (320×180, 16:9)**, que corresponde a `snippet.thumbnails.medium.url` na API. Evite `hqdefault`/`sddefault` (4:3 com tarjas pretas) e `maxresdefault` (pode não existir). Para um fundo desfocado, a resolução baixa não importa.
- Validar o `videoId` com regex, para o parâmetro não virar uma URL arbitrária.
- Sempre ter um **fallback**: cor sólida/gradiente CSS padrão se qualquer etapa falhar.

## 2. Fluxo

```
Hero (videoId) -> <img/background> /api/cover-bg?id=VIDEO_ID
                  servidor: baixa mqdefault -> sharp (RGBA) -> Kawarp frame() -> sharp (WebP) 
                  <- imagem 640x360 com cache longo
Hero mostra a imagem como fundo (2 camadas, crossfade na troca de faixa)
```

## 3. Dependências

```bash
npm install @kawarp/core sharp
```

## 4. Route Handler — `app/api/cover-bg/route.ts`

```ts
import sharp from 'sharp';
import { frame } from '@kawarp/core/frame';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // sharp precisa de Node (não use Edge)

const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const OUT_W = 640;
const OUT_H = 360;

async function fallbackImage() {
  // cor sólida escura da identidade do Ember, caso algo falhe
  const buf = await sharp({
    create: { width: OUT_W, height: OUT_H, channels: 3, background: '#1a120f' },
  })
    .webp({ quality: 70 })
    .toBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=60' },
  });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!ID_RE.test(id)) return fallbackImage();

  try {
    const res = await fetch(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`, {
      next: { revalidate: 60 * 60 * 24 * 7 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`thumb ${res.status}`);
    const input = Buffer.from(await res.arrayBuffer());

    // 1) JPEG -> RGBA cru. O README manda usar .ensureAlpha() antes de .raw()
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 2) Quadro estático do Kawarp (CPU, sem WebGL)
    const pixels = frame(new Uint8Array(data), info.width, info.height, OUT_W, OUT_H, {
      warpIntensity: 0.9,
      saturation: 1.4,
      time: 12, // "time" fixo = quadro fixo (12 é o padrão do README)
    });

    // 3) RGBA -> WebP. O README avisa que, em imagens estáticas, o quadro sai de cabeça
    //    para baixo, então invertemos na vertical com .flip()
    const webp = await sharp(Buffer.from(pixels), {
      raw: { width: OUT_W, height: OUT_H, channels: 4 },
    })
      .flip()
      .webp({ quality: 75 })
      .toBuffer();

    return new NextResponse(new Uint8Array(webp), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch {
    return fallbackImage(); // a UI nunca quebra
  }
}
```

> **Importante:** o README diz que o resultado da `frame()` sai "upside down" em imagens estáticas e que a ordem é *top row first*. Por isso o `.flip()` acima. Se na sua tela o fundo aparecer invertido ou sem a inversão necessária, é só remover/ajustar essa linha.

> Se o import `@kawarp/core/frame` falhar no build do Next.js (pacote ESM), adicione em `next.config.ts`: `serverExternalPackages: ['sharp']` e, se necessário, `transpilePackages: ['@kawarp/core']`.

## 5. Componente — `components/player/HeroKawarpBackground.tsx`

CSS não anima a troca entre dois `background-image`; por isso há **duas camadas** com crossfade por opacidade. A imagem é pré-carregada antes de aparecer, para evitar piscadas.

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';

const BASE = '#0b0b0f';

export function HeroKawarpBackground({ videoId }: { videoId?: string }) {
  const [layers, setLayers] = useState<(string | null)[]>([null, null]);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useEffect(() => {
    if (!videoId) return;
    const url = `/api/cover-bg?id=${encodeURIComponent(videoId)}`;
    let cancelled = false;

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const next = activeRef.current === 0 ? 1 : 0;
      setLayers((prev) => {
        const copy = [...prev];
        copy[next] = url;
        return copy;
      });
      activeRef.current = next;
      setActive(next);
    };
    img.src = url; // se falhar, mantém o fundo atual

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{ backgroundColor: BASE }}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-out motion-reduce:transition-none"
          style={{
            backgroundImage: layers[i] ? `url(${layers[i]})` : undefined,
            opacity: active === i ? 1 : 0,
          }}
        />
      ))}
      {/* véu para garantir contraste do texto branco */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}
```

Uso na hero (o container pai precisa de `relative`):

```tsx
<section className="relative min-h-dvh overflow-hidden">
  <HeroKawarpBackground videoId={currentTrack?.videoId} />
  {/* conteúdo do player */}
</section>
```

## 6. Obtendo o `videoId` pela API v3

Em `videos.list` ou `search.list`, use `part=snippet`. O `videoId` é `id` (em `videos.list`) ou `id.videoId` (em `search.list`). A thumbnail para exibir a capa em si é `snippet.thumbnails.medium.url` ou `high.url`.

A chave da API deve ficar só no servidor (variável de ambiente **sem** prefixo `NEXT_PUBLIC_`).

## 7. Opção avançada (fase 2): Kawarp animado no cliente

Só depois que o método estático estiver funcionando. O README documenta `@kawarp/react` com a prop `src` e as opções `warpIntensity`, `animationSpeed`, `transitionDuration`, `scale` etc.

```tsx
import { Kawarp } from '@kawarp/react';

<Kawarp
  src={`/api/cover-image?id=${videoId}`} // rota que devolve os bytes da thumbnail do seu domínio
  warpIntensity={0.8}
  style={{ position: 'absolute', inset: 0 }}
/>
```

Cuidados:
- Use sempre uma URL **do seu próprio domínio** (rota que repassa a imagem), nunca a URL do `i.ytimg.com` direto, para evitar CORS.
- Carregue só no cliente (`'use client'` ou `dynamic(..., { ssr: false })`) e tenha o fundo estático da seção 5 como fallback se o WebGL não estiver disponível.
- O README não diz se `animationSpeed: 0` congela totalmente a animação. Teste antes de depender disso. Se quiser parar, existe o método `stop()` na API do `@kawarp/core`.

## 8. Checklist de testes (nesta ordem)

1. Abra `/api/cover-bg?id=<um videoId real>` no navegador: deve aparecer uma imagem desfocada e colorida, 640×360.
2. Confira a orientação do resultado. Se estiver de cabeça para baixo, ajuste o `.flip()`.
3. Teste `?id=abc` (inválido): deve devolver a imagem de fallback, sem erro.
4. Teste um ID de 11 caracteres que não existe: também deve devolver o fallback com status 200.
5. Na hero, troque de faixa: o fundo deve fazer crossfade sem piscar.
6. Confira o contraste do texto branco com capas muito claras e muito escuras.
7. Ative "reduzir movimento" no sistema: a transição deve ficar instantânea.
8. Faça o deploy de preview na Vercel e repita o item 1 (valida `sharp` e `@kawarp/core/frame` no ambiente real).

## 9. Observações

- Este código não foi executado em um projeto real. Ele segue a documentação do README do Kawarp (assinatura `frame(rgba, width, height, outW, outH, options)`, `.ensureAlpha()` antes de `.raw()` e aviso de orientação). Rode o checklist antes de publicar.
- As thumbnails do YouTube são frames do vídeo, não necessariamente a capa do álbum; o fundo reflete essa imagem.
- Os termos de serviço da API do YouTube têm exigências sobre exibição do player e uso de conteúdo. Confira-os antes de lançar a reprodução.
- Kawarp é MIT: mantenha o aviso de licença se copiar trechos do código dele (usando via npm, o aviso já vem no pacote).