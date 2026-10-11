export interface MusicCatalogItem {
  id: string
  type: 'album' | 'track' | 'artist' | 'playlist'
  genre: string
  title: string
  subtitle: string
  imageUrl: string
  videoId?: string
  metadata?: {
    releaseYear?: string
    duration?: string
    isExplicit?: boolean
    albumName?: string
    channelTitle?: string
  }
}
