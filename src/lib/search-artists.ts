const ARTIST_OPTIONS_EVENT = 'artist-options-updated'

export function dispatchArtistOptions(options: string[]) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ARTIST_OPTIONS_EVENT, { detail: options }))
  }
}

export function listenArtistOptions(cb: (options: string[]) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<string[]>).detail)
  window.addEventListener(ARTIST_OPTIONS_EVENT, handler)
  return () => window.removeEventListener(ARTIST_OPTIONS_EVENT, handler)
}
