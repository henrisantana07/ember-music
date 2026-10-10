const YOUTUBE_VIDEO_URL = (videoId: string) =>
  `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`

const YOUTUBE_LOW_RES_PATTERN = /(hqdefault|mqdefault|sddefault|default)\.jpg/

/**
 * Eleva uma URL de capa para a maior resolução disponível.
 * - YouTube (i.ytimg.com): hqdefault/mqdefault/etc -> maxresdefault
 * - YouTube Music (googleusercontent.com): =w120-h120 -> =w1200-h1200
 * - Demais fontes (ex.: Deezer) retornam inalteradas.
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
    if (YOUTUBE_LOW_RES_PATTERN.test(url)) {
      return url.replace(YOUTUBE_LOW_RES_PATTERN, 'maxresdefault.jpg')
    }
    return url
  }

  return url
}

/**
 * Volta para a miniatura padrão (hqdefault) — usado no onError quando
 * maxresdefault.jpg não existe (retorna 404) para alguns vídeos.
 */
export function getLowResCoverUrl(url: string, videoId?: string): string {
  if (url.includes('ytimg.com') && url.includes('maxresdefault')) {
    return url.replace('maxresdefault.jpg', 'hqdefault.jpg')
  }
  if (!url && videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  }
  return url
}
