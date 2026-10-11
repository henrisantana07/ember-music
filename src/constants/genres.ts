export interface GenreDefinition {
  id: string
  name: string
  aliases: string[]
}

export const MUSIC_GENRES: { id: string; name: string }[] = [
  { id: 'pop', name: 'Pop' },
  { id: 'rock', name: 'Rock' },
  { id: 'hip-hop', name: 'Hip-Hop' },
  { id: 'eletronica', name: 'Eletrônica' },
  { id: 'sertanejo', name: 'Sertanejo' },
  { id: 'funk', name: 'Funk' },
  { id: 'mpb', name: 'MPB' },
  { id: 'rap', name: 'Rap' },
  { id: 'indie', name: 'Indie' },
  { id: 'classica', name: 'Clássica' },
  { id: 'jazz', name: 'Jazz' },
  { id: 'reggae', name: 'Reggae' },
  { id: 'country', name: 'Country' },
  { id: 'metal', name: 'Metal' },
  { id: 'lofi', name: 'Lo-fi' },
  { id: 'samba', name: 'Samba' },
]

const GENRE_ALIASES: Record<string, string[]> = {
  pop: ['pop', 'pop music', 'k pop', 'top 40'],
  rock: ['rock', 'rock and roll', 'rock music', 'indie rock', 'alternative rock', 'alt rock'],
  'hip-hop': ['hip hop', 'hiphop', 'rap', 'trap', 'grime'],
  eletronica: ['eletronica', 'electronic', 'edm', 'house', 'techno', 'electro', 'dubstep', 'trance'],
  sertanejo: ['sertanejo', 'sertanejo universitario'],
  funk: ['funk', 'funk carioca', 'funk brasileiro', 'baile funk'],
  mpb: ['mpb', 'musica popular brasileira', 'musica brasileira'],
  rap: ['rap', 'boom bap', 'freestyle rap', 'rap nacional'],
  indie: ['indie', 'indie pop', 'independent'],
  classica: ['classica', 'classical', 'orquestra', 'orchestra', 'sinfonia', 'symphony', 'sonata', 'concerto'],
  jazz: ['jazz', 'smooth jazz'],
  reggae: ['reggae', 'dancehall', 'dub', 'ska'],
  country: ['country', 'country music', 'americana'],
  metal: ['metal', 'heavy metal', 'death metal', 'thrash', 'metalcore'],
  lofi: ['lofi', 'lo fi', 'chillhop', 'chill out', 'study beats', 'beats to relax', 'relaxing beats'],
  samba: ['samba', 'pagode', 'samba enredo', 'partido alto'],
}

export const GENRE_DEFINITIONS: GenreDefinition[] = MUSIC_GENRES.map((g) => ({
  id: g.id,
  name: g.name,
  aliases: GENRE_ALIASES[g.id] ?? [],
}))
