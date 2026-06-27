export interface GenreGradient {
  from: string
  to: string
}

export const genreGradients: Record<string, GenreGradient> = {
  'pop':          { from: '#E8115B', to: '#FF6B9D' },
  'rock':         { from: '#BA5D07', to: '#E8923A' },
  'electronic':   { from: '#0D73EC', to: '#5BA3F5' },
  'jazz':         { from: '#8C67AC', to: '#C4A0E8' },
  'classical':    { from: '#1E3264', to: '#4A6FA5' },
  'hip-hop':      { from: '#E91429', to: '#FF6B7A' },
  'r&b':          { from: '#503750', to: '#8A6B8A' },
  'folk':         { from: '#477D44', to: '#7DB07A' },
  'metal':        { from: '#3D3D3D', to: '#6B6B6B' },
  'reggae':       { from: '#1DB954', to: '#5EDB82' },
  'blues':        { from: '#1A5276', to: '#3D7DB0' },
  'country':      { from: '#B7950B', to: '#E0C040' },
  'latin':        { from: '#C0392B', to: '#E87060' },
  'soul':         { from: '#6E2F8C', to: '#A860C8' },
  'ambient':      { from: '#1A6B8A', to: '#4A9DB8' },
  'funk':         { from: '#D4770C', to: '#F5A040' },
}

export function getGenreGradient(name: string): GenreGradient {
  const key = name.toLowerCase().trim()
  return genreGradients[key] ?? { from: '#FF8800', to: '#FFB800' }
}
