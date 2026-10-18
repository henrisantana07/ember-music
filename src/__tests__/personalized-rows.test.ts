import { describe, it, expect } from 'vitest'
import {
  rankArtistsFromHistory,
  tracksFromHistory,
  albumsFromHistory,
  applyFollowedArtistImages,
  interleave,
  dedupe,
} from '@/lib/personalized-rows'
import type { PlaybackHistoryItem } from '@/lib/playback-history'
import type { Track } from '@/types/music'

function makeTrack(over: Partial<Track>): Track {
  return {
    id: 't1',
    name: 'Faixa',
    duration: 180,
    artist_id: 'c-alpha',
    artist_name: 'Alpha',
    album_id: 'al1',
    album_name: 'Primeiro',
    image: 'img.jpg',
    audio: null,
    url: '',
    source: 'youtube',
    ...over,
  } as unknown as Track
}

// O histórico chega ordenado da mais recente para a mais antiga, então os
// fixtures são escritos nessa ordem.
function history(...entries: Array<[Track, string]>): PlaybackHistoryItem[] {
  return entries.map(([track, playedAt]) => ({
    id: `${track.id}-${playedAt}`,
    user_id: 'u1',
    track_id: track.id,
    track_data: track,
    played_at: playedAt,
  }))
}

describe('rankArtistsFromHistory', () => {
  it('ordena pela quantidade de faixas distintas ouvidas, não pela ordem de entrada', () => {
    const alpha1 = makeTrack({ id: 'a1', artist_id: 'c-alpha', artist_name: 'Alpha' })
    const alpha2 = makeTrack({ id: 'a2', artist_id: 'c-alpha', artist_name: 'Alpha' })
    const alpha3 = makeTrack({ id: 'a3', artist_id: 'c-alpha', artist_name: 'Alpha' })
    const beta1 = makeTrack({ id: 'b1', artist_id: 'c-beta', artist_name: 'Beta' })

    // Beta aparece primeiro no histórico, mas Alpha tem mais repertório ouvido.
    const ranked = rankArtistsFromHistory(
      history([beta1, '2026-10-17T09:00:00Z'], [alpha3, '2026-10-17T08:00:00Z'], [alpha2, '2026-10-17T09:30:00Z'], [alpha1, '2026-10-17T10:00:00Z']),
    )

    expect(ranked.map((a) => a.id)).toEqual(['c-alpha', 'c-beta'])
  })

  it('desempata pela recência quando a contagem de faixas empatar', () => {
    const alpha = makeTrack({ id: 'a1', artist_id: 'c-alpha', artist_name: 'Alpha' })
    const beta = makeTrack({ id: 'b1', artist_id: 'c-beta', artist_name: 'Beta' })

    const ranked = rankArtistsFromHistory(
      history([beta, '2026-10-17T08:00:00Z'], [alpha, '2026-10-17T10:00:00Z']),
    )

    expect(ranked.map((a) => a.id)).toEqual(['c-alpha', 'c-beta'])
  })

  it('usa o registro mais recente do artista como nome e imagem', () => {
    const velho = makeTrack({ id: 'a1', artist_name: 'Alpha', image: 'velho.jpg' })
    const novo = makeTrack({ id: 'a2', artist_name: 'Alpha Novo', image: 'novo.jpg' })

    const ranked = rankArtistsFromHistory(
      history([novo, '2026-10-17T10:00:00Z'], [velho, '2026-10-17T08:00:00Z']),
    )

    expect(ranked).toHaveLength(1)
    expect(ranked[0].name).toBe('Alpha Novo')
    expect(ranked[0].image).toBe('novo.jpg')
    expect(ranked[0].image_xl).toBe('novo.jpg')
  })

  it('ignora entradas sem artist_id ou artist_name', () => {
    const semId = makeTrack({ id: 'a1', artist_id: '' })
    const semNome = makeTrack({ id: 'b1', artist_name: '' })

    expect(rankArtistsFromHistory(history([semId, '2026-10-17T10:00:00Z'], [semNome, '2026-10-17T09:00:00Z']))).toEqual([])
  })

  it('descarta played_at inválido sem quebrar o ranking', () => {
    const alpha = makeTrack({ id: 'a1', artist_id: 'c-alpha', artist_name: 'Alpha' })

    const ranked = rankArtistsFromHistory(history([alpha, 'data-invalida']))

    expect(ranked.map((a) => a.id)).toEqual(['c-alpha'])
  })
})

describe('applyFollowedArtistImages', () => {
  it('substitui a capa do track pela foto de perfil salva em followed_artists', () => {
    const artists = rankArtistsFromHistory(
      history([makeTrack({ artist_id: 'c1', artist_name: 'Alpha', image: 'capa-do-album.jpg' }), '2026-10-17T10:00:00Z']),
    )
    expect(artists[0].image).toBe('capa-do-album.jpg')

    const withPhoto = applyFollowedArtistImages(artists, new Map([['c1', 'foto-perfil.jpg']]))

    expect(withPhoto[0].image).toBe('foto-perfil.jpg')
    expect(withPhoto[0].image_xl).toBe('foto-perfil.jpg')
    expect(withPhoto[0].id).toBe('c1')
    expect(withPhoto[0].name).toBe('Alpha')
  })

  it('mantém a capa para quem não está seguido', () => {
    const artists = rankArtistsFromHistory(
      history([makeTrack({ artist_id: 'c1', artist_name: 'Alpha', image: 'capa.jpg' }), '2026-10-17T10:00:00Z']),
    )

    const result = applyFollowedArtistImages(artists, new Map([['outro-canal', 'foto.jpg']]))

    expect(result[0].image).toBe('capa.jpg')
  })

  it('ignora registro seguido que não tem imagem salva', () => {
    const artists = rankArtistsFromHistory(
      history([makeTrack({ artist_id: 'c1', image: 'capa.jpg' }), '2026-10-17T10:00:00Z']),
    )

    const result = applyFollowedArtistImages(artists, new Map([['c1', '']]))

    expect(result[0].image).toBe('capa.jpg')
  })

  it('mapa vazio devolve a mesma lista', () => {
    const artists = rankArtistsFromHistory(
      history([makeTrack({ artist_id: 'c1', image: 'capa.jpg' }), '2026-10-17T10:00:00Z']),
    )

    expect(applyFollowedArtistImages(artists, new Map())).toEqual(artists)
  })
})

describe('tracksFromHistory', () => {
  it('mantém a ordem de recência e remove repetições', () => {
    const t1 = makeTrack({ id: 't1' })
    const t2 = makeTrack({ id: 't2' })
    const t3 = makeTrack({ id: 't3' })

    const tracks = tracksFromHistory(
      history([t3, '2026-10-17T10:00:00Z'], [t2, '2026-10-17T09:00:00Z'], [t3, '2026-10-17T08:00:00Z'], [t1, '2026-10-17T07:00:00Z']),
    )

    expect(tracks.map((t) => t.id)).toEqual(['t3', 't2', 't1'])
  })

  it('lista vazia devolve lista vazia', () => {
    expect(tracksFromHistory([])).toEqual([])
  })
})

describe('albumsFromHistory', () => {
  it('deduplica por album_id preservando a ordem de recência', () => {
    const um = makeTrack({ id: 't1', album_id: 'al1', album_name: 'Primeiro' })
    const repetido = makeTrack({ id: 't2', album_id: 'al1', album_name: 'Primeiro' })
    const tres = makeTrack({ id: 't3', album_id: 'al3', album_name: 'Terceiro' })

    const albums = albumsFromHistory(
      history([um, '2026-10-17T10:00:00Z'], [repetido, '2026-10-17T09:00:00Z'], [tres, '2026-10-17T08:00:00Z']),
    )

    expect(albums.map((a) => a.id)).toEqual(['al1', 'al3'])
  })

  it('descarta faixa sem album_id ou sem album_name', () => {
    const semId = makeTrack({ id: 't1', album_id: '' })
    const semNome = makeTrack({ id: 't2', album_id: 'al2', album_name: '' })

    expect(albumsFromHistory(history([semId, '2026-10-17T10:00:00Z'], [semNome, '2026-10-17T09:00:00Z']))).toEqual([])
  })

  it('monta o Album a partir do track_data guardado', () => {
    const track = makeTrack({ id: 't1', album_id: 'al9', album_name: 'Nono', artist_name: 'Alpha', image: 'capa.jpg' })

    const [album] = albumsFromHistory(history([track, '2026-10-17T10:00:00Z']))

    expect(album).toMatchObject({
      id: 'al9',
      name: 'Nono',
      artist_name: 'Alpha',
      image: 'capa.jpg',
      release_date: '',
      total_tracks: 0,
    })
  })
})

describe('interleave', () => {
  it('alterna entre os grupos e vai até o grupo mais longo', () => {
    expect(
      interleave([
        ['a1', 'a2', 'a3'],
        ['b1', 'b2'],
        ['c1'],
      ]),
    ).toEqual(['a1', 'b1', 'c1', 'a2', 'b2', 'a3'])
  })

  it('sem grupos devolve lista vazia', () => {
    expect(interleave([])).toEqual([])
  })

  it('grupos vazios são ignorados sem interromper a rodada', () => {
    expect(interleave([[], ['b1'], []])).toEqual(['b1'])
  })
})

describe('dedupe', () => {
  it('mantém a primeira ocorrência e a ordem original', () => {
    expect(dedupe([{ id: 'a' }, { id: 'b' }, { id: 'a' }, { id: 'c' }])).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
  })

  it('descarta itens sem id', () => {
    expect(dedupe([{ id: 'a' }, { id: '' }, { id: 'b' }])).toEqual([{ id: 'a' }, { id: 'b' }])
  })
})
