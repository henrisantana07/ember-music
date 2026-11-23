/** ID de vídeo do YouTube: exatamente 11 caracteres da alfabeto URL-safe. */
export const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

export function isValidYouTubeVideoId(value?: string | null): value is string {
  return !!value && YOUTUBE_VIDEO_ID_RE.test(value)
}

/**
 * Extrai o `videoId` de um link do YouTube sem consultar nenhuma API.
 *
 * Formatos aceitos:
 * - `dQw4w9WgXcQ` (o próprio id, útil para dados legados)
 * - `https://youtu.be/dQw4w9WgXcQ`
 * - `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
 * - `https://music.youtube.com/watch?v=dQw4w9WgXcQ`
 * - `https://www.youtube.com/shorts/dQw4w9WgXcQ`
 * - `https://www.youtube.com/embed/dQw4w9WgXcQ`
 * - `https://www.youtube.com/live/dQw4w9WgXcQ`
 *
 * Qualquer outro host/formato retorna `null` — quem chama decide o fallback.
 */
export function getYouTubeVideoIdFromLink(link?: string | null): string | null {
  if (!link) return null
  const raw = link.trim()
  if (!raw) return null

  // Já veio o id cru (algumas faixas legadas guardam isso em `url`).
  if (isValidYouTubeVideoId(raw)) return raw

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    // Link curto "solto", sem esquema: youtu.be/ID
    const short = /^youtu\.be\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/.exec(raw)
    return short ? short[1] : null
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] ?? ''
    return isValidYouTubeVideoId(id) ? id : null
  }

  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    const fromQuery = url.searchParams.get('v')
    if (isValidYouTubeVideoId(fromQuery)) return fromQuery

    const fromPath = /^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/.exec(url.pathname)
    if (fromPath) return fromPath[1]
  }

  return null
}
