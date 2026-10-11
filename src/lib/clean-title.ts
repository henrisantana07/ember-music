const NOISE_PATTERN =
  /^(?:official\s+)?(?:music\s+)?(?:video|audio)$|^official\s+video$|^lyric(?:s|\s+video)$|^visuali[sz]er$|^performance(?:\s+video)?$|^m\/v$|^hd$|^4k$/i

export function cleanDisplayTitle(title: string, artistName?: string): string {
  let out = title.replace(/\s*[([{]([^)\]}]{1,80})[)\]}]\s*/g, (match, inner: string) =>
    NOISE_PATTERN.test(inner.trim()) ? ' ' : match
  )
  out = out.replace(/\s{2,}/g, ' ').trim()

  if (artistName) {
    const prefix = artistName.trim()
    if (prefix && out.length > prefix.length && out.toLowerCase().startsWith(prefix.toLowerCase())) {
      const rest = out.slice(prefix.length)
      if (/^\s*[-–—|:]/.test(rest)) {
        out = rest.replace(/^\s*[-–—|:]\s*/, '').trim()
      }
    }
  }

  out = out.replace(/\s*[-–—|]\s*$/, '').trim()
  return out || title
}

export function cleanArtistName(name: string): string {
  const cleaned = name
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s+@\S+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return cleaned || name
}
