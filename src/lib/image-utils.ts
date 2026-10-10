const YOUTUBE_VIDEO_URL = (videoId: string) =>
  `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`

const YOUTUBE_LOW_RES_PATTERN = /(hqdefault|mqdefault|sddefault|default)\.jpg/

// Deezer: .../images/cover/<hash>/<W>x<H>-000000-80-0-0.jpg -> 1000x1000 (cover_xl)
const DEEZER_SIZE_PATTERN = /\/\d+x\d+-/

/**
 * Eleva uma URL de capa para a maior resolução disponível.
 * - YouTube (i.ytimg.com): hqdefault/mqdefault/etc -> maxresdefault
 * - YouTube Music (googleusercontent.com): =w120-h120 -> =w1200-h1200
 * - Deezer (dzcdn.net): qualquer tamanho -> 1000x1000 (cover_xl)
 * - Demais fontes retornam inalteradas.
 */
export function getHighResCoverUrl(url?: string | null, videoId?: string): string {
  if (!url) {
    return videoId ? YOUTUBE_VIDEO_URL(videoId) : ''
  }

  if (url.includes('googleusercontent.com')) {
    const baseUrl = url.split('=')[0]
    return `${baseUrl}=w1200-h1200-l90-rj`
  }

  if (url.includes('ytimg.com')) {
    // Já é a máxima resolução — evita o regex casar "default" dentro de "maxresdefault"
    if (url.includes('maxresdefault')) {
      return url
    }
    if (YOUTUBE_LOW_RES_PATTERN.test(url)) {
      return url.replace(YOUTUBE_LOW_RES_PATTERN, 'maxresdefault.jpg')
    }
    return url
  }

  if (url.includes('dzcdn.net')) {
    return url.replace(DEEZER_SIZE_PATTERN, '/1000x1000-')
  }

  return url
}

/**
 * Volta para uma resolução segura — usado no onError quando a versão HD
 * não existe (retorna 404).
 */
export function getLowResCoverUrl(url: string, videoId?: string): string {
  if (url.includes('ytimg.com') && url.includes('maxresdefault')) {
    return url.replace('maxresdefault.jpg', 'hqdefault.jpg')
  }
  if (url.includes('dzcdn.net') && url.includes('1000x1000')) {
    return url.replace(DEEZER_SIZE_PATTERN, '/500x500-')
  }
  if (!url && videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  }
  return url
}
