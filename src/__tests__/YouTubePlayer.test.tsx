import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { YouTubePlayer, useYouTubePlayer } from '@/components/YouTubePlayer'

type FakeEvent = { target: FakePlayer; data: number }

interface FakePlayer {
  playVideo: ReturnType<typeof vi.fn>
  pauseVideo: ReturnType<typeof vi.fn>
  seekTo: ReturnType<typeof vi.fn>
  setVolume: ReturnType<typeof vi.fn>
  getCurrentTime: ReturnType<typeof vi.fn>
  getDuration: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

const { fakePlayer, playerCtor, state } = vi.hoisted(() => {
  const fakePlayer = {
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    seekTo: vi.fn(),
    setVolume: vi.fn(),
    getCurrentTime: vi.fn(() => 42),
    getDuration: vi.fn(() => 180),
    destroy: vi.fn(),
  }
  const state = { PLAYING: 1, PAUSED: 2, ENDED: 0, BUFFERING: 3, CUED: 5, UNSTARTED: -1 }
  const playerCtor = vi.fn(function (
    _element: HTMLElement,
    options: { videoId: string; events: { onReady?: (e: FakeEvent) => void } }
  ) {
    setTimeout(() => options.events.onReady?.({ target: fakePlayer, data: 0 }), 0)
    return fakePlayer
  })
  return { fakePlayer, playerCtor, state }
})

beforeEach(() => {
  playerCtor.mockClear()
  fakePlayer.playVideo.mockClear()
  fakePlayer.pauseVideo.mockClear()
  fakePlayer.seekTo.mockClear()
  fakePlayer.destroy.mockClear()
  fakePlayer.getCurrentTime.mockClear()
  vi.stubGlobal('YT', { Player: playerCtor, PlayerState: state })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('YouTubePlayer', () => {
  it('renderiza o container do player', () => {
    render(<YouTubePlayer videoId="abc123" />)
    expect(screen.getByTitle('YouTube player')).toBeInTheDocument()
  })

  it('retorna null sem videoId', () => {
    const { container } = render(<YouTubePlayer videoId={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('cria o player com o videoId correto', async () => {
    render(<YouTubePlayer videoId="abc123" className="w-12 h-12" />)

    await waitFor(() => expect(playerCtor).toHaveBeenCalledTimes(1))
    expect(playerCtor.mock.calls[0][1].videoId).toBe('abc123')
    expect(screen.getByTitle('YouTube player')).toHaveClass('w-12 h-12')
  })

  it('anexa o container do hook ao DOM (player criado no elemento visível)', async () => {
    const { container } = render(<YouTubePlayer videoId="abc123" />)
    await waitFor(() => expect(playerCtor).toHaveBeenCalledTimes(1))

    const domElement = playerCtor.mock.calls[0][0]
    expect(container.contains(domElement)).toBe(true)
  })
})

describe('useYouTubePlayer', () => {
  let hookApi: ReturnType<typeof useYouTubePlayer> | null = null

  function HookProbe({ videoId }: { videoId: string | null }) {
    hookApi = useYouTubePlayer(videoId)
    return <div data-testid="probe" ref={hookApi.containerRef} data-ready={String(hookApi.isReady)} />
  }

  beforeEach(() => {
    hookApi = null
  })

  it('inicia pronto após o onReady do YouTube', async () => {
    const { unmount } = render(<HookProbe videoId="abc123" />)

    await waitFor(() => expect(hookApi?.isReady).toBe(true))
    expect(hookApi?.duration).toBe(180)
    expect(fakePlayer.setVolume).toHaveBeenCalledWith(100)

    unmount()
    expect(fakePlayer.destroy).toHaveBeenCalled()
  })

  it('play/pause/seek controlam o player', async () => {
    const { unmount } = render(<HookProbe videoId="abc123" />)
    await waitFor(() => expect(hookApi?.isReady).toBe(true))

    act(() => hookApi?.play())
    expect(fakePlayer.playVideo).toHaveBeenCalledTimes(1)

    act(() => hookApi?.pause())
    expect(fakePlayer.pauseVideo).toHaveBeenCalledTimes(1)

    act(() => hookApi?.seek(30))
    expect(fakePlayer.seekTo).toHaveBeenCalledWith(30, true)
    expect(hookApi?.currentTime).toBe(30)

    unmount()
  })

  it('setVolume normaliza para 0-100', async () => {
    const { unmount } = render(<HookProbe videoId="abc123" />)
    await waitFor(() => expect(hookApi?.isReady).toBe(true))

    act(() => hookApi?.setVolume(0.5))
    expect(fakePlayer.setVolume).toHaveBeenCalledWith(50)
    expect(hookApi?.volume).toBe(0.5)

    act(() => hookApi?.setVolume(2))
    expect(fakePlayer.setVolume).toHaveBeenLastCalledWith(100)

    unmount()
  })

  it('polling atualiza o tempo atual e para no unmount', async () => {
    const { unmount } = render(<HookProbe videoId="abc123" />)
    await waitFor(() => expect(hookApi?.isReady).toBe(true))

    fakePlayer.getCurrentTime.mockReturnValue(77)
    await act(async () => {
      await new Promise(r => setTimeout(r, 650))
    })
    expect(hookApi?.currentTime).toBe(77)

    unmount()
    expect(fakePlayer.destroy).toHaveBeenCalled()
  })

  it('não cria player sem videoId', async () => {
    const { unmount } = render(<HookProbe videoId={null} />)

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    expect(playerCtor).not.toHaveBeenCalled()
    expect(hookApi?.isReady).toBe(false)

    unmount()
  })
})
