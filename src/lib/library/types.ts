import type { PlaylistItem } from '@/lib/playlists-store'
import type { FollowedArtist } from '@/lib/artists-store'
import type { Album } from '@/types/music'
import { resolveCover } from '@/lib/playlist/resolveCover'

/**
 * Tipos reais da biblioteca do Ember Music.
 *
 * `podcast` do guia de origem fica de fora: o projeto não oferece esse tipo
 * de conteúdo. Fontes reais confirmadas:
 * - `playlist`: tabela `playlists` (store do Supabase).
 * - `artist`: tabela `followed_artists` (store do Supabase).
 * - `album`: resultado de `/api/youtube?endpoint=albums` (searchYouTubePlaylists,
 *   API do YouTube com cache no servidor) — aberto em /albums/[id].
 * - `liked`: coleção da tabela `favorites` — a "Músicas curtidas", que mora
 *   na aba `favoritos` de /biblioteca.
 */
export type LibraryItemType = 'playlist' | 'artist' | 'album' | 'liked'

export type LibraryView = 'compact' | 'list' | 'grid'

/**
 * Ordenações suportadas pelos campos realmente existentes:
 * - `recent`: `created_at` (playlists) / `followed_at` (artistas) /
 *   `release_date` (álbuns) / `created_at` (curtidas)
 * - `alphabetical`: título normalizado
 * `custom` só entra quando a reordenação manual estiver implementada e persistida.
 */
export type LibrarySort = 'recent' | 'added' | 'alphabetical' | 'creator'

/** Modelo de apresentação da biblioteca, normalizado a partir das fontes reais. */
export interface LibraryItem {
  id: string
  type: LibraryItemType
  title: string
  subtitle?: string
  imageUrl?: string | null
  /** Campo de data real da fonte; null quando a fonte não tem data. */
  createdAt?: string | null
  creator?: string | null
  href: string
}

/** A coleção de curtidas é um atalho fixo (como a "Músicas curtidas" do guia
 *  de origem): entra sempre no topo, fora dos filtros de tipo. */
export const LIKED_ITEM_ID = 'liked'

export function isLikedItem(item: LibraryItem): boolean {
  return item.type === 'liked'
}

function playlistToLibraryItem(playlist: PlaylistItem, creatorDisplayName: string): LibraryItem {
  return {
    id: playlist.id,
    type: 'playlist',
    title: playlist.name,
    subtitle: `${playlist.track_count} ${playlist.track_count === 1 ? 'faixa' : 'faixas'}`,
    imageUrl: resolveCover(playlist).url,
    createdAt: playlist.created_at,
    creator: creatorDisplayName || playlist.user_id,
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
    creator: artist.artist_data?.name ?? 'Artista',
    href: `/artists/${artist.artist_id}`,
  }
}

function albumToLibraryItem(album: Album): LibraryItem {
  return {
    id: album.id,
    type: 'album',
    title: album.name,
    subtitle: album.artist_name,
    imageUrl: album.image,
    createdAt: album.release_date ?? null,
    creator: album.artist_name,
    href: `/albums/${album.id}`,
  }
}

function likedToLibraryItem(likedCount: number): LibraryItem {
  return {
    id: LIKED_ITEM_ID,
    type: 'liked',
    title: 'Músicas curtidas',
    subtitle: `${likedCount} ${likedCount === 1 ? 'faixa' : 'faixas'}`,
    imageUrl: null,
    createdAt: null,
    creator: null,
    href: '/biblioteca?tab=favoritos',
  }
}

/**
 * Normaliza as fontes reais em um único modelo de UI.
 *
 * O `creatorDisplayName` (nome/email do usuário) torna a ordenação por criador
 * honesta para as playlists, mesmo que elas pertençam ao próprio usuário.
 */
export function buildLibraryItems(
  playlists: PlaylistItem[],
  artists: FollowedArtist[],
  albums: Album[] = [],
  likedCount: number = 0,
  creatorDisplayName: string = '',
): LibraryItem[] {
  const items: LibraryItem[] = []

  if (likedCount > 0) {
    items.push(likedToLibraryItem(likedCount))
  }

  items.push(
    ...playlists.map((playlist) => playlistToLibraryItem(playlist, creatorDisplayName)),
    ...albums.map(albumToLibraryItem),
    ...artists.map(artistToLibraryItem),
  )
  return items
}
