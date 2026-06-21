import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrackCard } from '@/components/TrackCard'
import type { SpotifyTrack } from '@/types/spotify'

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  }),
}))

const mockTrack: SpotifyTrack = {
  id: '123',
  name: 'Test Song',
  artist_name: 'Test Artist',
  artist_id: 'artist1',
  album_name: 'Test Album',
  album_id: 'album1',
  image: 'https://example.com/image.jpg',
  audio: 'https://example.com/preview.mp3',
  duration: 180,
  spotify_url: 'https://open.spotify.com/track/123',
}

describe('TrackCard', () => {
  it('renders track name and artist', () => {
    render(<TrackCard track={mockTrack} />)
    expect(screen.getByText('Test Song')).toBeInTheDocument()
    expect(screen.getByText('Test Artist')).toBeInTheDocument()
  })
})
