export const genreColors: Record<string, string> = {
  'pop':          '#E8115B',
  'rock':         '#BA5D07',
  'electronic':   '#0D73EC',
  'jazz':         '#8C67AC',
  'classical':    '#1E3264',
  'hip-hop':      '#E91429',
  'r&b':          '#503750',
  'folk':         '#477D44',
  'metal':        '#3D3D3D',
  'reggae':       '#1DB954',
  'blues':        '#1A5276',
  'country':      '#B7950B',
  'latin':        '#C0392B',
  'soul':         '#6E2F8C',
  'ambient':      '#1A6B8A',
  'funk':         '#D4770C',
}

export function getGenreColor(name: string): string {
  const key = name.toLowerCase().trim()
  return genreColors[key] ?? '#FF8800'
}
