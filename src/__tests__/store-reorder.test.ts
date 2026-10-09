import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerStore } from '@/lib/store'
import type { Track } from '@/types/music'

function makeTrack(id: string): Track {
  return { id, name: id, artist_name: 'Artist', artist_id: '1', album_name: 'Album', duration: 100, image: '', audio: '', source: 'deezer' } as unknown as Track
}

function ids(list: Track[]): string[] {
  return list.map((t) => t.id)
}

beforeEach(() => {
  usePlayerStore.setState({
    queue: [],
    originalQueue: [],
    shuffleOrder: [],
    shuffle: false,
    currentShuffleIndex: 0,
  })
})

describe('reorderQueue', () => {
  it('move a faixa e mant├®m queue e originalQueue alinhadas', () => {
    const tracks = ['a', 'b', 'c', 'd'].map(makeTrack)
    usePlayerStore.setState({ queue: tracks, originalQueue: tracks })

    usePlayerStore.getState().reorderQueue(0, 2)

    const { queue, originalQueue } = usePlayerStore.getState()
    expect(ids(queue)).toEqual(['b', 'c', 'a', 'd'])
    expect(ids(originalQueue)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('move para tr├ís (├¡ndice maior para menor)', () => {
    const tracks = ['a', 'b', 'c', 'd'].map(makeTrack)
    usePlayerStore.setState({ queue: tracks, originalQueue: tracks })

    usePlayerStore.getState().reorderQueue(3, 0)

    expect(ids(usePlayerStore.getState().queue)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('preserva a sequ├¬ncia de faixas apontada pelo shuffleOrder ao reordenar', () => {
    const tracks = ['a', 'b', 'c', 'd'].map(makeTrack)
    usePlayerStore.setState({ queue: tracks, originalQueue: tracks, shuffle: true, shuffleOrder: [3, 1, 0, 2] })

    usePlayerStore.getState().reorderQueue(0, 2)

    const { queue, shuffleOrder } = usePlayerStore.getState()
    expect(ids(queue)).toEqual(['b', 'c', 'a', 'd'])
    expect(shuffleOrder).toEqual([3, 0, 2, 1])
    expect(shuffleOrder.map((i) => queue[i].id)).toEqual(['d', 'b', 'a', 'c'])
  })

  it('shuffleOrder permanece consistente na dire├º├úo inversa', () => {
    const tracks = ['a', 'b', 'c', 'd'].map(makeTrack)
    usePlayerStore.setState({ queue: tracks, originalQueue: tracks, shuffle: true, shuffleOrder: [3, 1, 0, 2] })

    usePlayerStore.getState().reorderQueue(2, 0)

    const { queue, shuffleOrder } = usePlayerStore.getState()
    expect(ids(queue)).toEqual(['c', 'a', 'b', 'd'])
    expect(shuffleOrder.map((i) => queue[i].id)).toEqual(['d', 'b', 'a', 'c'])
  })

  it('remapeia shuffleOrder mesmo com fila maior que a ordem de shuffle', () => {
    const tracks = ['a', 'b', 'c'].map(makeTrack)
    usePlayerStore.setState({
      queue: tracks,
      originalQueue: tracks,
      shuffle: true,
      shuffleOrder: [2, 1, 0],
    })
    usePlayerStore.getState().addToQueue(makeTrack('d'))

    usePlayerStore.getState().reorderQueue(0, 3)

    const { queue, shuffleOrder } = usePlayerStore.getState()
    expect(ids(queue)).toEqual(['b', 'c', 'd', 'a'])
    expect(shuffleOrder.map((i) => queue[i].id)).toEqual(['c', 'b', 'a'])
  })

  it('├¡ndices inv├ílidos ou repetidos n├úo corrompem a fila', () => {
    const tracks = ['a', 'b'].map(makeTrack)
    usePlayerStore.setState({ queue: tracks, originalQueue: tracks, shuffleOrder: [] })

    usePlayerStore.getState().reorderQueue(0, 0)
    usePlayerStore.getState().reorderQueue(5, 1)
    usePlayerStore.getState().reorderQueue(-1, 0)
    usePlayerStore.getState().reorderQueue(0, 99)

    const { queue, originalQueue } = usePlayerStore.getState()
    expect(ids(queue)).toEqual(['a', 'b'])
    expect(ids(originalQueue)).toEqual(['a', 'b'])
  })

  it('sem shuffle, shuffleOrder permanece intacta', () => {
    const tracks = ['a', 'b', 'c'].map(makeTrack)
    usePlayerStore.setState({ queue: tracks, originalQueue: tracks, shuffle: false, shuffleOrder: [] })

    usePlayerStore.getState().reorderQueue(0, 1)

    expect(usePlayerStore.getState().shuffleOrder).toEqual([])
  })
})

describe('removeFromQueue', () => {
  it('remove a faixa e mant├®m queue e originalQueue alinhadas', () => {
    const tracks = ['a', 'b', 'c'].map(makeTrack)
    usePlayerStore.setState({ queue: tracks, originalQueue: tracks })

    usePlayerStore.getState().removeFromQueue(1)

    const { queue, originalQueue } = usePlayerStore.getState()
    expect(ids(queue)).toEqual(['a', 'c'])
    expect(ids(originalQueue)).toEqual(['a', 'c'])
  })

  it('com shuffle, remove item antes do atual e decresce currentShuffleIndex', () => {
    const tracks = ['a', 'b', 'c', 'd'].map(makeTrack)
    usePlayerStore.setState({
      queue: tracks,
      originalQueue: tracks,
      shuffle: true,
      shuffleOrder: [2, 3, 0, 1],
      currentShuffleIndex: 2,
    })

    usePlayerStore.getState().removeFromQueue(2)

    const { queue, shuffleOrder, currentShuffleIndex } = usePlayerStore.getState()
    expect(ids(queue)).toEqual(['a', 'b', 'd'])
    expect(shuffleOrder).toEqual([2, 0, 1])
    expect(currentShuffleIndex).toBe(1)
    expect(queue[shuffleOrder[currentShuffleIndex]].id).toBe('a')
  })

  it('com shuffle, remove o item atual e aponta para o pr├│ximo', () => {
    const tracks = ['a', 'b', 'c', 'd'].map(makeTrack)
    usePlayerStore.setState({
      queue: tracks,
      originalQueue: tracks,
      shuffle: true,
      shuffleOrder: [2, 3, 0, 1],
      currentShuffleIndex: 1,
    })

    usePlayerStore.getState().removeFromQueue(3)

    const { queue, shuffleOrder, currentShuffleIndex } = usePlayerStore.getState()
    expect(ids(queue)).toEqual(['a', 'b', 'c'])
    expect(shuffleOrder).toEqual([2, 0, 1])
    expect(currentShuffleIndex).toBe(1)
    expect(queue[shuffleOrder[currentShuffleIndex]].id).toBe('a')
  })

  it('com shuffle, remove item ap├│s o atual sem mexer no currentShuffleIndex', () => {
    const tracks = ['a', 'b', 'c'].map(makeTrack)
    usePlayerStore.setState({
      queue: tracks,
      originalQueue: tracks,
      shuffle: true,
      shuffleOrder: [1, 2, 0],
      currentShuffleIndex: 0,
    })

    usePlayerStore.getState().removeFromQueue(2)

    const { queue, shuffleOrder, currentShuffleIndex } = usePlayerStore.getState()
    expect(ids(queue)).toEqual(['a', 'b'])
    expect(shuffleOrder).toEqual([1, 0])
    expect(currentShuffleIndex).toBe(0)
    expect(queue[shuffleOrder[0]].id).toBe('b')
  })

  it('├¡ndice inv├ílido n├úo altera a fila', () => {
    const tracks = ['a', 'b'].map(makeTrack)
    usePlayerStore.setState({ queue: tracks, originalQueue: tracks, shuffleOrder: [] })

    usePlayerStore.getState().removeFromQueue(-1)
    usePlayerStore.getState().removeFromQueue(5)

    expect(ids(usePlayerStore.getState().queue)).toEqual(['a', 'b'])
    expect(ids(usePlayerStore.getState().originalQueue)).toEqual(['a', 'b'])
  })
})
