import { describe, it, expect } from 'vitest'
import {
  getYouTubeVideoIdFromLink,
  isValidYouTubeVideoId,
} from '@/lib/youtube/video-id'

describe('getYouTubeVideoIdFromLink', () => {
  const ID = 'dQw4w9WgXcQ'

  it('aceita o próprio id cru', () => {
    expect(getYouTubeVideoIdFromLink(ID)).toBe(ID)
  })

  it('extrai de youtu.be (com e sem esquema)', () => {
    expect(getYouTubeVideoIdFromLink(`https://youtu.be/${ID}`)).toBe(ID)
    expect(getYouTubeVideoIdFromLink(`youtu.be/${ID}?t=10`)).toBe(ID)
  })

  it('extrai de watch?v= inclusive no YouTube Music', () => {
    expect(getYouTubeVideoIdFromLink(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID)
    expect(getYouTubeVideoIdFromLink(`https://music.youtube.com/watch?v=${ID}&list=PL123`)).toBe(ID)
    expect(getYouTubeVideoIdFromLink(`https://m.youtube.com/watch?v=${ID}`)).toBe(ID)
  })

  it('extrai de shorts, embed e live', () => {
    expect(getYouTubeVideoIdFromLink(`https://www.youtube.com/shorts/${ID}`)).toBe(ID)
    expect(getYouTubeVideoIdFromLink(`https://www.youtube.com/embed/${ID}`)).toBe(ID)
    expect(getYouTubeVideoIdFromLink(`https://www.youtube.com/live/${ID}`)).toBe(ID)
  })

  it('ignora links de outros sites e ids inválidos', () => {
    expect(getYouTubeVideoIdFromLink('https://open.spotify.com/track/abc')).toBeNull()
    expect(getYouTubeVideoIdFromLink('https://www.youtube.com/watch?v=curto')).toBeNull()
    expect(getYouTubeVideoIdFromLink(null)).toBeNull()
    expect(getYouTubeVideoIdFromLink('')).toBeNull()
  })
})

describe('isValidYouTubeVideoId', () => {
  it('exige exatamente 11 caracteres URL-safe', () => {
    expect(isValidYouTubeVideoId('dQw4w9WgXcQ')).toBe(true)
    expect(isValidYouTubeVideoId('abc-_123456')).toBe(true)
    expect(isValidYouTubeVideoId('abc123')).toBe(false)
    expect(isValidYouTubeVideoId('dQw4w9WgXcQ!')).toBe(false)
    expect(isValidYouTubeVideoId(null)).toBe(false)
  })
})
