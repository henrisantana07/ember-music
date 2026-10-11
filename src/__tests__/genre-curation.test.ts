import { describe, it, expect } from 'vitest'
import {
  normalizeGenreText,
  resolveGenre,
  trackToCatalogItem,
  albumToCatalogItem,
  artistToCatalogItem,
  isRelevantToGenre,
  filterByGenre,
  curateGenreCatalog,
} from '@/lib/genre-curation'
import type { Album, Artist, Track } from '@/types/music'

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'youtube:abc',
    name: 'Some Song',
    duration: 125,
    artist_id: 'UC1',
    artist_name: 'Some Artist',
    album_id: 'PL1',
    album_name: 'Some Album',
    image: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
    audio: null,
    url: 'https://www.youtube.com/watch?v=abc',
    youtubeVideoId: 'abc',
    ...overrides,
  }
}

function makeAlbum(overrides: Partial<Album> = {}): Album {
  return {
    id: 'PL1',
    name: 'Greatest Hits',
    artist_id: 'UC1',
    artist_name: 'Some Artist',
    image: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
    release_date: '2020-05-01',
    total_tracks: 12,
    url: 'https://www.youtube.com/playlist?list=PL1',
    ...overrides,
  }
}

function makeArtist(overrides: Partial<Artist> = {}): Artist {
  return {
    id: 'UC1',
    name: 'Some Artist',
    image: 'https://yt3.ggpht.com/a.jpg',
    image_xl: '',
    followers: 0,
    genres: [],
    url: 'https://www.youtube.com/channel/UC1',
    website: '',
    ...overrides,
  }
}

describe('normalizeGenreText', () => {
  it('lowercases, strips accents and collapses punctuation', () => {
    expect(normalizeGenreText('Clássica!')).toBe('classica')
    expect(normalizeGenreText('  Hip-Hop  ')).toBe('hip hop')
    expect(normalizeGenreText('MÚSICA Brasileira')).toBe('musica brasileira')
  })
})

describe('resolveGenre', () => {
  it('resolves by id', () => {
    expect(resolveGenre('lofi')?.id).toBe('lofi')
  })

  it('resolves accented display name from the filter select', () => {
    expect(resolveGenre('clássica')?.id).toBe('classica')
    expect(resolveGenre('eletrônica')?.id).toBe('eletronica')
  })

  it('resolves hyphenated name', () => {
    expect(resolveGenre('hip-hop')?.id).toBe('hip-hop')
    expect(resolveGenre('lo-fi')?.id).toBe('lofi')
  })

  it('resolves by alias', () => {
    expect(resolveGenre('Lo Fi')?.id).toBe('lofi')
    expect(resolveGenre('EDM')?.id).toBe('eletronica')
  })

  it('returns null for unknown or empty values', () => {
    expect(resolveGenre('forro')).toBeNull()
    expect(resolveGenre('')).toBeNull()
  })
})

describe('toCatalogItem adapters', () => {
  it('maps a track to MusicCatalogItem with formatted duration', () => {
    const item = trackToCatalogItem(makeTrack())
    expect(item).toMatchObject({
      id: 'youtube:abc',
      type: 'track',
      title: 'Some Song',
      subtitle: 'Some Artist',
      videoId: 'abc',
      metadata: { duration: '2:05', albumName: 'Some Album', channelTitle: 'Some Artist' },
    })
  })

  it('maps an album with release year', () => {
    const item = albumToCatalogItem(makeAlbum())
    expect(item.type).toBe('album')
    expect(item.title).toBe('Greatest Hits')
    expect(item.metadata?.releaseYear).toBe('2020')
  })

  it('maps an artist preferring the xl image', () => {
    const item = artistToCatalogItem(makeArtist({ image_xl: 'https://xl.jpg' }))
    expect(item.type).toBe('artist')
    expect(item.imageUrl).toBe('https://xl.jpg')
  })
})

describe('isRelevantToGenre', () => {
  it('keeps items positively matched to the genre', () => {
    const item = trackToCatalogItem(makeTrack({ name: 'Lo-Fi Beats to Study To' }))
    expect(isRelevantToGenre(item, 'lo-fi')).toBe(true)
  })

  it('keeps neutral items without any genre signal (no false negatives)', () => {
    const item = trackToCatalogItem(makeTrack({ name: 'Bohemian Rhapsody', artist_name: 'Queen' }))
    expect(isRelevantToGenre(item, 'rock')).toBe(true)
  })

  it('drops items that clearly belong to another niche', () => {
    const item = trackToCatalogItem(makeTrack({ name: 'Best Death Metal Riffs' }))
    expect(isRelevantToGenre(item, 'pop')).toBe(false)
  })

  it('validates channel tags and album names, not only the title', () => {
    const onJazzChannel = trackToCatalogItem(
      makeTrack({ name: 'Untitled Live Session', artist_name: 'Blue Note Jazz Trio' })
    )
    expect(isRelevantToGenre(onJazzChannel, 'samba')).toBe(false)
    expect(isRelevantToGenre(onJazzChannel, 'jazz')).toBe(true)

    const jazzAlbum = albumToCatalogItem(makeAlbum({ name: 'Christmas Jazz Classics' }))
    expect(isRelevantToGenre(jazzAlbum, 'classica')).toBe(false)
  })

  it('matches plurals at word boundaries only', () => {
    const item = trackToCatalogItem(makeTrack({ name: 'Piano Concertos Vol. 3' }))
    expect(isRelevantToGenre(item, 'clássica')).toBe(true)

    const notMetal = trackToCatalogItem(makeTrack({ name: 'Metallica Live' }))
    expect(isRelevantToGenre(notMetal, 'rock')).toBe(true)
  })

  it('does not filter when the genre is unknown', () => {
    const item = trackToCatalogItem(makeTrack({ name: 'Anything' }))
    expect(isRelevantToGenre(item, 'forro')).toBe(true)
  })

  it('rejects items explicitly tagged with a different genre', () => {
    const tagged = { ...trackToCatalogItem(makeTrack({ name: 'Neutral Title' })), genre: 'jazz' }
    expect(isRelevantToGenre(tagged, 'rock')).toBe(false)
    expect(isRelevantToGenre({ ...tagged, genre: 'rock' }, 'rock')).toBe(true)
  })
})

describe('filterByGenre', () => {
  it('returns the original list when no genre is given', () => {
    const tracks = [makeTrack()]
    expect(filterByGenre(tracks, '', trackToCatalogItem)).toBe(tracks)
  })

  it('keeps only genre-coherent items', () => {
    const tracks = [
      makeTrack({ id: '1', name: 'Rock Anthem' }),
      makeTrack({ id: '2', name: 'Sertanejo Universitario Hits' }),
      makeTrack({ id: '3', name: 'Random Video' }),
    ]
    const result = filterByGenre(tracks, 'rock', trackToCatalogItem)
    expect(result.map((t) => t.id)).toEqual(['1', '3'])
  })
})

describe('curateGenreCatalog', () => {
  it('curates tracks, albums and artists and tags artist genres', () => {
    const tracks = [
      makeTrack({ id: '1', name: 'Samba de Roda' }),
      makeTrack({ id: '2', name: 'Death Metal Anthems' }),
    ]
    const albums = [
      makeAlbum({ id: 'PL1', name: 'Samba Gold' }),
      makeAlbum({ id: 'PL2', name: 'Metal Hammer' }),
    ]
    const artists = [makeArtist({ id: 'UC1', name: 'Samba Primeiro' })]

    const result = curateGenreCatalog(tracks, albums, artists, 'samba')

    expect(result.tracks.map((t) => t.id)).toEqual(['1'])
    expect(result.albums.map((a) => a.id)).toEqual(['PL1'])
    expect(result.artists[0].genres).toContain('Samba')
  })

  it('falls back to the original list when strict curation would empty it', () => {
    const tracks = [makeTrack({ id: '1', name: 'Sertanejo Universitario 2024' })]
    const result = curateGenreCatalog(tracks, [], [], 'samba')
    expect(result.tracks.map((t) => t.id)).toEqual(['1'])
  })

  it('does not duplicate genre tags', () => {
    const artists = [makeArtist({ genres: ['Lo-fi'] })]
    const result = curateGenreCatalog([], [], artists, 'lo-fi')
    expect(result.artists[0].genres).toEqual(['Lo-fi'])
  })
})
