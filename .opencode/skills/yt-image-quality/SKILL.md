---
name: yt-image-quality
description: Especializada exclusivamente no tratamento, otimização e elevação de qualidade de capas de álbuns vindas das APIs do YouTube e YouTube Music para HD/MaxRes (maxresdefault / =w1200), garantindo compatibilidade com CORS, proxy e fast-average-color. Use quando for mexer em thumbnails, capas, imagens de faixa/álbum, `i.ytimg.com`, `googleusercontent.com`, `maxresdefault`, `hqdefault`, `youtubeVideoId`, `extractDominantColor`, `image-proxy`, glow/gradiente da hero ou upgrade de resolução de imagem. Trigger keywords: yt-image, yt-quality, cover-hd, optimize-youtube-images, thumbnail HD, capa maxres, imagem YouTube Music, upgrade resolução.
---

# SKILL: YouTube & YouTube Music Image Quality & Resolution Specialist

## 1. OBJETIVO DA SKILL
Esta skill atua exclusivamente no pipeline de tratamento de imagens de áudio/vídeo do YouTube, resolvendo o problema de miniaturas pixeladas ou de baixa resolução sem quebrar o sistema de extração de cores (*glow/gradiente*) e os fallbacks de rede (CORS / Proxy).

Stack: **React + TypeScript** (Next.js App Router).

## 2. REGRAS TÉCNICAS DE TRATAMENTO DE IMAGEM (YOUTUBE APIS)

### Mapeamento e Elevação de URLs (CDN YouTube & YouTube Music)
A API do YouTube retorna por padrão miniaturas compactas (`hqdefault.jpg`, `mqdefault.jpg` ou `=w120-h120`). A skill exige a substituição por padrões de altíssima definição:

- **Thumbnails de Vídeos (`i.ytimg.com`):**
  - *Origem fraca:* `https://i.ytimg.com/vi/<videoId>/hqdefault.jpg` (480x360 com barras pretas)
  - *Transformação HD:* `https://i.ytimg.com/vi/<videoId>/maxresdefault.jpg` (1280x720)

- **Thumbnails do YouTube Music (`googleusercontent.com`):**
  - *Origem fraca:* `https://lh3.googleusercontent.com/...=w120-h120-l90-rj`
  - *Transformação HD:* `https://lh3.googleusercontent.com/...=w1200-h1200-l90-rj`

## 3. EXEMPLOS PRÁTICOS DE TRANSFORMAÇÃO (BEFORE VS. AFTER)

### Exemplo A: Thumbnail Padrão de Vídeo
- **Entrada:** `https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg`
- **Saída (HD):** `https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg`

### Exemplo B: Thumbnail do YouTube Music
- **Entrada:** `https://lh3.googleusercontent.com/a1b2c3d4e5f6=w120-h120-l90-rj`
- **Saída (HD):** `https://lh3.googleusercontent.com/a1b2c3d4e5f6=w1200-h1200-l90-rj`

## 4. EXEMPLOS DE CÓDIGO E IMPLEMENTAÇÃO NO PROJETO

### Função Utilitária Padrão (`src/lib/image-utils.ts`)
```typescript
export function getHighResCoverUrl(url?: string | null, videoId?: string): string {
  if (!url && videoId) {
    return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  }
  if (!url) return ''
  if (url.includes('googleusercontent.com')) {
    const baseUrl = url.split('=')[0]
    return `${baseUrl}=w1200-h1200-l90-rj`
  }
  if (url.includes('ytimg.com')) {
    return url.replace(/(hqdefault|mqdefault|sddefault|default)\.jpg/, 'maxresdefault.jpg')
  }
  return url
}
```

### Aplicação na Busca do YouTube (`src/lib/youtube-service.ts`)
```typescript
import { getHighResCoverUrl } from '@/lib/image-utils'

const rawImage = snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url
const image = getHighResCoverUrl(rawImage, videoId)
```

### Exibição da Capa com Fallback de Erro e CORS (`NowPlaying/index.tsx`)
```tsx
import React, { useState } from 'react'
import { getHighResCoverUrl } from '@/lib/image-utils'

interface OptimizedCoverProps {
  currentTrackImage?: string
  youtubeVideoId: string
  trackTitle: string
}

export function OptimizedNowPlayingCover({ currentTrackImage, youtubeVideoId, trackTitle }: OptimizedCoverProps) {
  const [imgSrc, setImgSrc] = useState(() =>
    getHighResCoverUrl(currentTrackImage, youtubeVideoId)
  )

  return (
    <img
      src={imgSrc || `https://i.ytimg.com/vi/${youtubeVideoId}/maxresdefault.jpg`}
      alt={trackTitle}
      className="now-playing-cover"
      crossOrigin="anonymous" // Essencial para leitura de pixels pelo fast-average-color (extractDominantColor)
      onError={() => {
        // Fallback automático: Se o arquivo maxresdefault.jpg retornar 404, reduz para hqdefault.jpg
        if (imgSrc.includes('maxresdefault.jpg')) {
          setImgSrc(`https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`)
        }
      }}
    />
  )
}
```

## 5. FLUXO DE COMPATIBILIDADE COM PROXY E EXTRAÇÃO DE COR

1. **Exibição:** o `<img>` carrega **direto** do CDN a URL em HD (`maxresdefault` / `=w1200`). Sem passar pelo proxy.
2. **Glow / Gradiente (`extractDominantColor`):**
   - Tenta ler via Canvas no browser com `crossOrigin="anonymous"`.
   - Caso o navegador bloqueie por CORS, recorre ao proxy local `/api/image-proxy?src=<URL_HD>`, que lê os bytes em alta resolução com cache de 24h para alimentar o `fast-average-color`.

### Ressalva importante (estado atual do projeto)
- O proxy `src/app/api/image-proxy/route.ts` permite host `i.ytimg.com` (e suffixos `.ytimg.com`), **mas NÃO permite `googleusercontent.com`**. Ou seja: capa de vídeo do YouTube (`i.ytimg.com`) funciona no fallback de cor via proxy; capa vinda do YouTube Music (`lh3.googleusercontent.com`) **cairia em 403 (Host not allowed)** no proxy hoje. Se for usar a elevação HD de YT Music, é preciso **adicionar `googleusercontent.com` a `ALLOWED_HOST_SUFFIXES`** nesse arquivo antes de depender do fallback de cor.
- O `extractDominantColor` amostra a **região central 50%×50%** da imagem e aplica `vibrateColor` (boost de saturação/luminosidade). `maxresdefault.jpg` do YouTube tem barras pretas laterais (16:9 dentro de 1280x720); a região central 50% cai bem no miolo da arte e evita as barras.
