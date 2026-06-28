export const colors = {
  bgBase: '#0A0908',
  bgSurface: '#161311',
  bgElevated: '#211C18',
  accentFrom: '#FF6A00',
  accentTo: '#FFC400',
  accentSolid: '#FF8800',
  accentMuted: 'rgba(201, 98, 0, 0.13)',
  textPrimary: '#F5F1ED',
  textSecondary: '#A39B92',
  textDisabled: '#5C564F',
  success: '#4CAF6D',
  error: '#E5484D',
} as const

export function normalizeQuery(query: string): string {
  return query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function getTrackUrl(track: { audio?: string }): string {
  return track.audio || ''
}
