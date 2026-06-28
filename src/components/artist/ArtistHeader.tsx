'use client'

import { ArtistHeaderBackground } from './ArtistHeaderBackground'
import { ArtistPhoto } from './ArtistPhoto'
import { ArtistFollowButton } from './ArtistFollowButton'
import { ArtistMenu } from './ArtistMenu'
import type { Artist } from '@/types/music'

interface ArtistHeaderProps {
  artist: Artist
  onPlay: () => void
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1).replace('.', ',') + ' M'
  if (count >= 1_000) return (count / 1_000).toFixed(count % 1_000 === 0 ? 0 : 1).replace('.', ',') + ' mil'
  return count.toLocaleString('pt-BR')
}

export function ArtistHeader({ artist, onPlay }: ArtistHeaderProps) {
  const imageUrl = artist.image_xl || artist.image

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: 400 }}>
      <ArtistHeaderBackground imageUrl={imageUrl} artistName={artist.name} />

      <div className="relative z-10 flex flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <ArtistPhoto imageUrl={imageUrl} name={artist.name} />

        <h1 className="text-4xl font-bold tracking-tight">{artist.name}</h1>

        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {formatFollowers(artist.followers)} seguidores
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onPlay}
            className="px-8 py-2.5 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
              color: '#fff',
            }}
          >
            Tocar
          </button>

          <ArtistFollowButton
            artistId={artist.id}
            artistData={{ id: artist.id, name: artist.name, image: artist.image }}
          />

          <ArtistMenu artistName={artist.name} artistUrl={artist.url} />
        </div>
      </div>
    </div>
  )
}
