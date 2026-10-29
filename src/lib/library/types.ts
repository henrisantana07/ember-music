import type { PlaylistItem } from '@/lib/playlists-store'
import type { FollowedArtist } from '@/lib/artists-store'
import { resolveCover } from '@/lib/playlist/resolveCover'

/**
 * Tipos reais da biblioteca do Ember Music.
 *
 * `podcast` do guia de origem fica de fora: o projeto não oferece esse tipo
 * de conteúdo. `albuns` também não entra enquanto não houver fonte de dados
 * real (store consulta de álbuns) — nada é inventado aqui.
 */
export type LibraryItemType = 'playlist' | 'artist'

export type LibraryView = 'compact' | 'list' | 'grid'

/**
 * Ordenações suportadas pelos campos realmente existentes:
 * - `recent`: `created_at` (playlists, banco) / `followed_at` (artistas, banco)
 * - `alphabetical`: título normalizado
 * `custom` só entra quando a reordenação manual estiver implementada e persistida.
 */
export type LibrarySort = 'recent' | 'alphabetical'

/** Modelo de apresentação da biblioteca, normalizado a partir das stores reais. */
export interface LibraryItem {
  id: string
  type: LibraryItemType
  title: string
  subtitle?: string
  imageUrl?: string | null
  /** Campo de data real do banco: `created_at` ou `followed_at`. */
  createdAt?: string | null
  href: string
}

function playlistToLibraryItem(playlist: PlaylistItem): LibraryItem {
  return {
    id: playlist.id,
    type: 'playlist',
    title: playlist.name,
    subtitle: `${playlist.track_count} ${playlist.track_count === 1 ? 'faixa' : 'faixas'}`,
    imageUrl: resolveCover(playlist).url,
    createdAt: playlist.created_at,
    href: `/playlists/${playlist.id}`,
  }
}

function artistToLibraryItem(artist: FollowedArtist): LibraryItem {
  return {
    id: artist.artist_id,
    type: 'artist',
    title: artist.artist_data?.name ?? 'Artista',
    imageUrl: artist.artist_data?.image ?? null,
    createdAt: artist.followed_at,
    href: `/artists/${artist.artist_id}`,
  }
}

/** Normaliza playlists e artistas das stores reais em um único modelo de UI. */
export function buildLibraryItems(
  playlists: PlaylistItem[],
  artists: FollowedArtist[],
): LibraryItem[] {
  return [...playlists.map(playlistToLibraryItem), ...artists.map(artistToLibraryItem)]
}
