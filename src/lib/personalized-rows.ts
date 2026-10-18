import type { PlaybackHistoryItem } from '@/lib/playback-history'
import type { Track, Album, Artist } from '@/types/music'

// ---------------------------------------------------------------------------
// Fileiras personalizadas da home
//
// `listening_history` guarda UMA linha por faixa (unique (user_id, track_id)),
// então não existe contagem de reproduções: ouvir de novo apenas move
// `played_at`. Sem migration, "mais ouvidos" é aproximado pela quantidade de
// faixas distintas ouvidas do artista, com a recência como desempate — quem
// tem mais repertório ouvido aparece antes, e dois artistas empatados são
// resolvidos a favor de quem tocou por último.
// ---------------------------------------------------------------------------

export function rankArtistsFromHistory(history: PlaybackHistoryItem[]): Artist[] {
  const byArtist = new Map<string, { ids: Set<string>; last: number; sample: Track }>()

  for (const item of history) {
    const track = item.track_data as unknown as Track | null
    if (!track?.artist_id || !track.artist_name) continue

    let entry = byArtist.get(track.artist_id)
    if (!entry) {
      // A história vem da mais recente para a mais antiga, então o primeiro
      // registro de um artista é o mais novo — imagem sempre a mais fresca.
      entry = { ids: new Set<string>(), last: 0, sample: track }
      byArtist.set(track.artist_id, entry)
    }
    if (track.id) entry.ids.add(track.id)

    const played = Date.parse(item.played_at ?? '')
    if (Number.isFinite(played)) entry.last = Math.max(entry.last, played)
  }

  return [...byArtist.values()]
    .sort((a, b) => b.ids.size - a.ids.size || b.last - a.last)
    .map((entry) => ({
      id: entry.sample.artist_id,
      name: entry.sample.artist_name,
      image: entry.sample.image || '',
      image_xl: entry.sample.image || '',
      followers: 0,
      genres: [],
      url: '',
      website: '',
    }))
}

// A imagem dentro de `track_data` é a capa do álbum/playlist que tocou — não a
// foto do artista. Para quem o usuário segue, prevalece a imagem salva em
// `followed_artists.artist_data`, que carrega o avatar real do canal. Quem não
// está seguido mantém a capa como fallback.
export function applyFollowedArtistImages(
  artists: Artist[],
  followedById: Map<string, string>,
): Artist[] {
  if (followedById.size === 0) return artists
  return artists.map((artist) => {
    const saved = followedById.get(artist.id)
    if (!saved) return artist
    return { ...artist, image: saved, image_xl: saved }
  })
}

export function tracksFromHistory(history: PlaybackHistoryItem[]): Track[] {
  const seen = new Set<string>()
  const tracks: Track[] = []
  for (const item of history) {
    const track = item.track_data as unknown as Track | null
    if (!track?.id || seen.has(track.id)) continue
    seen.add(track.id)
    tracks.push(track)
  }
  return tracks
}

export function albumsFromHistory(history: PlaybackHistoryItem[]): Album[] {
  const seen = new Set<string>()
  const albums: Album[] = []
  for (const item of history) {
    const track = item.track_data as unknown as Track | null
    if (!track?.album_id || !track.album_name || seen.has(track.album_id)) continue
    seen.add(track.album_id)
    albums.push({
      id: track.album_id,
      name: track.album_name,
      artist_id: track.artist_id,
      artist_name: track.artist_name,
      image: track.image,
      release_date: '',
      total_tracks: 0,
      url: '',
    })
  }
  return albums
}

// Intercala por artista para uma fileira não ser dominada pelo primeiro canal.
export function interleave<T>(groups: T[][]): T[] {
  const rows = Math.max(0, ...groups.map((group) => group.length))
  const out: T[] = []
  for (let i = 0; i < rows; i++) {
    for (const group of groups) {
      const item = group[i]
      if (item) out.push(item)
    }
  }
  return out
}

export function dedupe<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}
