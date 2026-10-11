import type { Album, Artist, Track } from '@/types/music'
import type { MusicCatalogItem } from '@/types/catalog'
import { GENRE_DEFINITIONS, type GenreDefinition } from '@/constants/genres'
import { formatDuration } from '@/lib/spotify'

export function normalizeGenreText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export interface ResolvedGenre {
  id: string
  name: string
  aliases: string[]
}

export function resolveGenre(value: string): ResolvedGenre | null {
  const key = normalizeGenreText(value)
  if (!key) return null
  const byIdOrName = GENRE_DEFINITIONS.find(
    (g) => normalizeGenreText(g.id) === key || normalizeGenreText(g.name) === key
  )
  if (byIdOrName) return byIdOrName
  return GENRE_DEFINITIONS.find((g) => g.aliases.some((a) => normalizeGenreText(a) === key)) ?? null
}

export function trackToCatalogItem(track: Track, genre = ''): MusicCatalogItem {
  return {
    id: track.id,
    type: 'track',
    genre,
    title: track.name,
    subtitle: track.artist_name,
    imageUrl: track.image,
    videoId: track.youtubeVideoId,
    metadata: {
      duration: formatDuration(track.duration),
      albumName: track.album_name || undefined,
      channelTitle: track.artist_name,
    },
  }
}

export function albumToCatalogItem(album: Album, genre = ''): MusicCatalogItem {
  return {
    id: album.id,
    type: 'album',
    genre,
    title: album.name,
    subtitle: album.artist_name,
    imageUrl: album.image,
    metadata: {
      releaseYear: album.release_date ? album.release_date.split('-')[0] : undefined,
      channelTitle: album.artist_name,
    },
  }
}

export function artistToCatalogItem(artist: Artist, genre = ''): MusicCatalogItem {
  return {
    id: artist.id,
    type: 'artist',
    genre,
    title: artist.name,
    subtitle: artist.genres?.[0] ?? '',
    imageUrl: artist.image_xl || artist.image,
    metadata: {
      channelTitle: artist.name,
    },
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchesAlias(text: string, alias: string): boolean {
  const normalized = normalizeGenreText(alias)
  if (!normalized) return false
  const pattern = new RegExp(`(^| )${escapeRegex(normalized)}s?( |$)`)
  return pattern.test(text)
}

function matchesGenre(text: string, genre: GenreDefinition): boolean {
  return [genre.name, genre.id, ...genre.aliases].some((alias) => matchesAlias(text, alias))
}

function itemText(item: MusicCatalogItem): string {
  return normalizeGenreText(
    [item.title, item.subtitle, item.metadata?.albumName, item.metadata?.channelTitle]
      .filter(Boolean)
      .join(' ')
  )
}

export function isRelevantToGenre(item: MusicCatalogItem, genre: string): boolean {
  const resolved = resolveGenre(genre)
  if (!resolved) return true

  if (item.genre) {
    const itemGenre = resolveGenre(item.genre)
    if (itemGenre && itemGenre.id === resolved.id) return true
    if (itemGenre) return false
  }

  const text = itemText(item)
  if (!text) return true
  if (matchesGenre(text, resolved)) return true

  const belongsToOtherGenre = GENRE_DEFINITIONS.some(
    (g) => g.id !== resolved.id && matchesGenre(text, g)
  )
  return !belongsToOtherGenre
}

export function filterByGenre<T>(
  items: T[],
  genre: string,
  toItem: (item: T) => MusicCatalogItem
): T[] {
  if (!genre) return items
  return items.filter((item) => isRelevantToGenre(toItem(item), genre))
}

export interface GenreCatalog {
  tracks: Track[]
  albums: Album[]
  artists: Artist[]
}

function keepOrFallback<T>(curated: T[], original: T[]): T[] {
  return curated.length > 0 ? curated : original
}

export function curateGenreCatalog(
  tracks: Track[],
  albums: Album[],
  artists: Artist[],
  genre: string
): GenreCatalog {
  const resolved = resolveGenre(genre)
  const genreLabel = resolved?.name ?? genre

  const curatedTracks = keepOrFallback(
    filterByGenre(tracks, genre, (t) => trackToCatalogItem(t)),
    tracks
  )
  const curatedAlbums = keepOrFallback(
    filterByGenre(albums, genre, (a) => albumToCatalogItem(a)),
    albums
  )
  const curatedArtists = keepOrFallback(
    filterByGenre(artists, genre, (a) => artistToCatalogItem(a)),
    artists
  ).map((artist) => {
    if (artist.genres?.includes(genreLabel)) return artist
    return { ...artist, genres: [...(artist.genres ?? []), genreLabel] }
  })

  return { tracks: curatedTracks, albums: curatedAlbums, artists: curatedArtists }
}
