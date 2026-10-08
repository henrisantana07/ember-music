# Prompt Dedicado — Sincronização Completa YouTube ↔ Player · EmberMusic (Antigravity)

Você é um engenheiro de software sênior trabalhando no projeto **Ember Music**.

Repositório: `henrisantana07/ember-music`

**Antes de qualquer alteração, leia os arquivos listados na seção 1.** A implementação da YouTube Data API já existe e está funcional. O objetivo desta tarefa é exclusivamente corrigir e completar a sincronização de estado, eventos e controles entre o player do site e o player embutido do YouTube.

---

## 1. ARQUIVOS CRÍTICOS — LEIA TODOS ANTES DE ESCREVER QUALQUER LINHA

```
src/components/Player/index.tsx          ← player principal (footer)
src/components/NowPlaying/index.tsx      ← player expandido + fila
src/components/YouTubePlayer/index.tsx   ← hook useYouTubePlayer + componente
src/lib/store.ts                         ← Zustand (fonte da verdade global)
src/types/music.ts                       ← tipo Track com source/youtubeVideoId
```

Entenda o que já funciona antes de tocar qualquer coisa.

---

## 2. CONTEXTO DO QUE JÁ EXISTE

### Stack de playback atual

O projeto tem **dois mecanismos de reprodução paralelos**:

```
Track.source === 'deezer'  →  <audio ref={audioRef} />  (HTMLAudioElement nativo)
Track.source === 'youtube' →  useYouTubePlayer(videoId) (IFrame API do YouTube)
```

### Hook `useYouTubePlayer` (YouTubePlayer/index.tsx)

- Carrega a YouTube IFrame API via script tag uma única vez
- Cria um `YT.Player` apontado para um `<div ref={containerRef}>`
- Expõe: `play()`, `pause()`, `seek(seconds)`, `setVolume(vol)`, `destroy()`
- Estado local do hook: `isReady`, `isPlaying`, `duration`, `currentTime`, `volume`, `error`
- Polling de `currentTime` e `duration` a cada **500ms** via `setInterval`
- Detecta estados via `onPlayerStateChange`: `PLAYING`, `PAUSED`, `ENDED`

### Como o Player.tsx consome o hook

```typescript
const isYouTubeTrack = currentTrack?.source === 'youtube' && !!currentTrack.youtubeVideoId
const ytVideoId = isYouTubeTrack ? (currentTrack.youtubeVideoId ?? '') : null
const yt = useYouTubePlayer(ytVideoId)

// Progresso exibido na barra
const currentDuration = isYouTubeTrack ? yt.duration : duration
const currentProgress = isYouTubeTrack ? yt.currentTime : progress
```

### Como o NowPlaying.tsx consome o hook

Mesma lógica — cria **uma segunda instância** de `useYouTubePlayer` com o mesmo `videoId`.

### Problema estrutural identificado

O mesmo `videoId` inicializa **duas instâncias de `YT.Player`** — uma em `Player.tsx` e outra em `NowPlaying.tsx`. As duas tentam controlar o mesmo vídeo de forma independente, gerando dessincronização.

---

## 3. PROBLEMAS A CORRIGIR (escopo desta tarefa)

### 3.1 — Instância dupla do YT.Player

**Sintoma:** ao abrir o player expandido (`NowPlaying`), dois iframes do YouTube são criados para o mesmo vídeo. O estado de `isPlaying`, `currentTime` e `duration` diverge entre os dois.

**Causa:** `useYouTubePlayer` é chamado tanto em `Player.tsx` quanto em `NowPlaying.tsx` com o mesmo `videoId`, criando dois `YT.Player` independentes.

**Solução obrigatória:** transformar `useYouTubePlayer` em um **singleton por videoId** — uma única instância de `YT.Player` compartilhada entre todos os consumidores.

Estratégia recomendada:

```typescript
// Criar um Context ou store Zustand separado para o estado YouTube
// Ex: src/lib/youtube-player-store.ts

interface YouTubePlayerStore {
  videoId: string | null
  playerRef: YTPlayer | null
  isReady: boolean
  isPlaying: boolean
  duration: number
  currentTime: number
  error: string | null
  setVideoId: (id: string | null) => void
  setPlayerRef: (player: YTPlayer | null) => void
  // ... actions
}
```

O `<div ref={containerRef}>` onde o `YT.Player` é montado deve existir em **um único lugar na árvore DOM** — dentro do `Player.tsx` (footer), sempre montado. O `NowPlaying` deve consumir o estado desse store, não criar sua própria instância.

Alternativa mais simples se o Zustand adicionar complexidade: usar `React.createContext` com `useContext` e um `Provider` único em `layout.tsx` ou em um wrapper dedicado.

**Nunca** renderizar dois `<YouTubePlayer videoId={...} />` ao mesmo tempo para o mesmo vídeo.

---

### 3.2 — Barra de progresso não avança para faixas YouTube

**Sintoma:** ao tocar uma faixa do YouTube, a barra de progresso no footer (`Player.tsx`) fica estática em 0:00.

**Causa provável:** o polling do hook (`setInterval` de 500ms) atualiza o estado local do hook via `setState`, mas o `Player.tsx` lê `yt.currentTime` de uma snapshot do objeto retornado pelo hook. Se o componente não re-renderizar quando o estado do hook atualiza, a barra não avança.

**Verificar:** se `useYouTubePlayer` retorna um objeto novo a cada render e o `Player.tsx` lê `yt.currentTime` diretamente no JSX, isso deve funcionar — **testar antes de mudar**. Se não funcionar, a correção é garantir que o polling chame `setState` de forma que cause re-render nos consumidores.

**Após corrigir a instância dupla (3.1):** se o estado do YouTube viver em um store Zustand, o polling deve chamar a action do store (`setCurrentTime(n)`) em vez de um `setState` local. Todos os consumidores do store (Player footer + NowPlaying) re-renderizarão automaticamente.

---

### 3.3 — Play/Pause do store não comanda o YT.Player

**Sintoma:** clicar em Play/Pause no footer não inicia/pausa o vídeo YouTube.

**Causa:** o `useEffect` em `Player.tsx` que chama `yt.play()` / `yt.pause()` pode estar disparando antes do player estar pronto (`yt.isReady === false`).

```typescript
// PROBLEMA: yt.play() é chamado antes de onPlayerReady disparar
useEffect(() => {
  if (isYouTubeTrack) {
    if (isPlaying) yt.play()
    else yt.pause()
  }
}, [isPlaying, isYouTubeTrack, yt])
```

**Correção:** incluir `yt.isReady` na dependência e na guarda:

```typescript
useEffect(() => {
  if (!isYouTubeTrack || !yt.isReady) return
  if (isPlaying) yt.play()
  else yt.pause()
}, [isPlaying, isYouTubeTrack, yt.isReady])
```

Além disso, dentro de `onPlayerReady`, verificar o estado atual do store e dar autoplay se `isPlaying === true`:

```typescript
const onPlayerReady = useCallback((event: YTPlayerEvent) => {
  const player = event.target
  player.setVolume(100)
  setState(s => ({ ...s, player, isReady: true, duration: player.getDuration() }))
  startPolling()
  // Autoplay se o store já está em playing quando o player fica pronto
  if (usePlayerStore.getState().isPlaying) {
    player.playVideo()
  }
}, [startPolling])
```

---

### 3.4 — Seek não funciona em faixas YouTube

**Sintoma:** clicar na barra de progresso não pula para o ponto correto no vídeo YouTube.

**Verificar em `Player.tsx`:**

```typescript
const handleSeek = useCallback((seconds: number) => {
  if (isYouTubeTrack) {
    yt.seek(seconds)
    setProgress(seconds)  // ← atualiza o store, mas para YouTube o progresso
                           //    vem do polling, não do store
  }
}, [isYouTubeTrack, yt])
```

O `yt.seek()` chama `playerRef.current?.seekTo(seconds, true)` — isso é correto. O problema pode ser:

1. `playerRef.current` é `null` no momento do seek (player não está pronto)
2. O polling sobrescreve `currentTime` com o valor antigo antes do seek completar

**Correção:** adicionar guarda de `isReady` antes do seek e adicionar debounce de 200ms no polling após um seek para dar tempo ao IFrame API de atualizar `getCurrentTime()`.

---

### 3.5 — Faixa YouTube termina mas não avança para próxima

**Sintoma:** quando o vídeo termina, o player fica parado em vez de avançar para a próxima faixa.

**Causa:** o evento `ENDED` do `onPlayerStateChange` atualiza apenas o estado local do hook (`isPlaying: false`), mas **não chama `next()` do store**.

**Correção:** em `onPlayerStateChange`, ao detectar `ENDED`, chamar `next()` do `usePlayerStore`:

```typescript
const onPlayerStateChange = useCallback((event: YTPlayerEvent) => {
  const { PlayerState } = window.YT
  if (event.data === PlayerState.PLAYING) {
    setState(s => ({ ...s, isPlaying: true }))
    usePlayerStore.getState().resume()         // ← sincronizar o store
  } else if (event.data === PlayerState.PAUSED) {
    setState(s => ({ ...s, isPlaying: false }))
    usePlayerStore.getState().pause()          // ← sincronizar o store
  } else if (event.data === PlayerState.ENDED) {
    setState(s => ({ ...s, isPlaying: false }))
    const { repeat } = usePlayerStore.getState()
    if (repeat === 'one') {
      // Repetir o mesmo vídeo
      event.target.seekTo(0, true)
      event.target.playVideo()
    } else {
      usePlayerStore.getState().next()         // ← avançar para próxima
    }
  }
}, [])
```

**Atenção ao ciclo de feedback:** ao chamar `resume()` e `pause()` do store dentro do `onPlayerStateChange`, o `useEffect` do `Player.tsx` que escuta `isPlaying` vai disparar e tentar chamar `yt.play()` / `yt.pause()` novamente. Isso cria um loop. Use uma ref de flag `suppressStoreSync` para evitar o loop:

```typescript
const suppressStoreSyncRef = useRef(false)

// No useEffect que escuta isPlaying:
useEffect(() => {
  if (!isYouTubeTrack || !yt.isReady) return
  if (suppressStoreSyncRef.current) {
    suppressStoreSyncRef.current = false
    return
  }
  if (isPlaying) yt.play()
  else yt.pause()
}, [isPlaying, isYouTubeTrack, yt.isReady])

// No onPlayerStateChange:
suppressStoreSyncRef.current = true
usePlayerStore.getState().pause()
```

---

### 3.6 — Volume não é aplicado ao YT.Player

**Sintoma:** mover o slider de volume no footer não altera o volume do vídeo YouTube.

**Verificar em `Player.tsx`:**

```typescript
useEffect(() => {
  if (!isYouTubeTrack && audioRef.current) audioRef.current.volume = volume
  else if (isYouTubeTrack) yt.setVolume(volume)
}, [volume, isYouTubeTrack, yt])
```

O `yt.setVolume(volume)` converte `0–1` para `0–100` internamente — verificar se a conversão está correta:

```typescript
// Em YouTubePlayer/index.tsx — setVolume
const setVolume = useCallback((vol: number) => {
  const v = Math.max(0, Math.min(1, vol)) * 100  // ← correto: 0–1 → 0–100
  playerRef.current?.setVolume(v)
  setState(s => ({ ...s, volume: vol }))
}, [])
```

Se o `useEffect` de volume disparar antes de `isReady`, o `playerRef.current` é `null`. **Correção:** adicionar guarda `yt.isReady`:

```typescript
useEffect(() => {
  if (!isYouTubeTrack || !yt.isReady) return
  yt.setVolume(volume)
}, [volume, isYouTubeTrack, yt.isReady])
```

---

### 3.7 — Thumbnail do vídeo no lugar da capa no mini player e no footer

**Situação atual:** quando a faixa é do YouTube, o footer e o mini player renderizam um `<YouTubePlayer>` embutido no lugar onde normalmente vai a capa do álbum:

```tsx
// Player.tsx — footer, lado esquerdo
{isYouTubeTrack ? (
  <YouTubePlayer videoId={ytVideoId} className="w-12 h-12 rounded" />
) : (
  <img src={currentTrack.image} ... />
)}
```

Isso cria um segundo iframe ativo (problema 3.1) e fica visualmente inadequado — o iframe do YouTube exibe controles ou tela preta.

**Referência visual (ESound Music):** apps de streaming como ESound mostram a **thumbnail do vídeo** como imagem estática no lugar da capa, não um iframe embutido. O player de vídeo completo só aparece no player expandido.

**Correção:** usar `currentTrack.image` (que já contém a thumbnail do YouTube, mapeada em `mapYouTubeTrack()`) como `<img>` estático no footer e mini player. Reservar o iframe `<YouTubePlayer>` apenas para o player expandido (`NowPlaying`):

```tsx
// Player.tsx — footer e mini player
// ANTES (problemático):
{isYouTubeTrack ? (
  <YouTubePlayer videoId={ytVideoId} className="w-12 h-12 rounded" />
) : (
  <img src={currentTrack.image} ... />
)}

// DEPOIS (correto):
<img
  src={currentTrack.image}
  alt={currentTrack.name}
  className="w-12 h-12 rounded object-cover flex-shrink-0"
/>
// O iframe só existe no NowPlaying (player expandido)
```

No `NowPlaying`, o iframe pode preencher a área da capa quando a faixa é YouTube:

```tsx
// NowPlaying.tsx — área da capa
{isYouTubeTrack ? (
  <YouTubePlayer videoId={ytVideoId} className="w-full h-full rounded-2xl" />
) : currentTrack.image ? (
  <img ... />
) : null}
```

---

### 3.8 — Botões do footer desabilitados/adaptados para YouTube

Alguns controles do player têm comportamento diferente para YouTube.

#### Regras por botão:

| Botão | Deezer | YouTube | Ação |
|---|---|---|---|
| Play/Pause | `togglePlay()` | `togglePlay()` + sincronizar YT.Player | Funciona igual, corrigir via 3.3 |
| Anterior (SkipBack) | `prev()` | `prev()` ou restart se `currentTime > 3s` | Ver abaixo |
| Próxima (SkipForward) | `next()` | `next()` | Funciona igual |
| Shuffle | `toggleShuffle()` | `toggleShuffle()` | Funciona igual |
| Repeat | cicla none→all→one | cicla none→all→one | `repeat:'one'` requer seek(0) no YT |
| Volume | `audioRef.volume` | `yt.setVolume()` | Corrigir via 3.6 |
| Seek (barra) | `audio.currentTime` | `yt.seek()` | Corrigir via 3.4 |
| Download | disponível | **desabilitado** | Toast "Download não disponível..." (já implementado no NowPlaying) |
| Sleep timer | `pause()` | `yt.pause()` | Já implementado em Player.tsx |

#### Botão Anterior — comportamento "restart antes de voltar":

```typescript
// Em Player.tsx e NowPlaying.tsx
function handlePrev() {
  const currentTime = isYouTubeTrack ? yt.currentTime : (audioRef.current?.currentTime ?? 0)
  if (currentTime > 3) {
    // Reiniciar a faixa atual em vez de voltar
    handleSeek(0)
  } else {
    prev()
  }
}
// Substituir: onClick={prev} → onClick={handlePrev}
```

#### Indicador visual de fonte no footer (badge YouTube):

Adicionar um badge discreto "YT" quando a faixa ativa for do YouTube, ao lado do nome da faixa:

```tsx
<div className="min-w-0">
  <div className="flex items-center gap-1.5">
    <p className="text-sm font-semibold truncate">{currentTrack.name}</p>
    {isYouTubeTrack && (
      <span className="flex-shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded"
        style={{ backgroundColor: 'rgba(255,0,0,0.15)', color: '#FF4444' }}>
        YT
      </span>
    )}
  </div>
  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
    {currentTrack.artist_name}
  </p>
</div>
```

---

### 3.9 — Sincronização do estado `isPlaying` entre YT.Player e o store

**Problema:** o `isPlaying` do `usePlayerStore` (Zustand) e o estado interno do hook `useYouTubePlayer` podem divergir. Exemplo: o usuário pausa via `togglePlay()` → o store vai para `isPlaying: false` → o `useEffect` tenta `yt.pause()` → mas se o player não estava pronto, a chamada é ignorada → o vídeo continua rodando.

**Solução:** a fonte da verdade para `isPlaying` de faixas YouTube deve ser o **evento do YT.Player** (`onPlayerStateChange`), não apenas o store. O store deve ser atualizado quando o YT.Player muda de estado, e o YT.Player deve ser comandado quando o store muda.

Fluxo correto:

```
Usuário clica Play/Pause
       ↓
togglePlay() → store.isPlaying muda
       ↓
useEffect detecta mudança
       ↓
yt.play() / yt.pause() (se isReady)
       ↓
YT.Player executa
       ↓
onPlayerStateChange dispara (PLAYING / PAUSED)
       ↓
[suppressStoreSync] → não chamar store.resume/pause de volta
```

---

### 3.10 — Troca de faixa YouTube (videoId muda)

**Problema:** ao trocar para uma faixa YouTube diferente, o `useYouTubePlayer` recebe um novo `videoId`. O `useEffect` do hook que escuta `videoId` chama `destroy()` e depois `createPlayer()`. Durante esse ciclo de vida, pode haver um frame onde `isReady === false` e o autoplay não é acionado.

**Verificar no hook:**

```typescript
useEffect(() => {
  if (videoId) {
    createPlayer()   // ← createPlayer é async, demora para YT.Player estar pronto
  } else {
    setTimeout(() => destroy(), 0)
  }
  return () => destroy()
}, [videoId, createPlayer, destroy])
```

**O autoplay deve ser garantido por `onPlayerReady`** (corrigido no item 3.3), não por este `useEffect`. Confirmar que `createPlayer` não tenta chamar `playVideo()` diretamente — isso pode falhar antes do `onReady`.

---

## 4. RESTRIÇÕES ABSOLUTAS

- **NÃO** reescrever `src/lib/store.ts` do zero — apenas adicionar o que for necessário
- **NÃO** remover funcionalidades Deezer existentes
- **NÃO** alterar a YouTube Data API (`/api/youtube/search`) — já está implementada e funcional
- **NÃO** extrair áudio do YouTube nem usar URLs internas do stream
- **NÃO** criar um segundo store Zustand para o player se puder ser resolvido via Context
- **NÃO** renderizar dois `<YouTubePlayer>` para o mesmo videoId simultaneamente
- **NÃO** adicionar `controls: 1` ao `playerVars` do IFrame API — o controle é feito pelos botões do Ember Music

---

## 5. ORDEM DE IMPLEMENTAÇÃO

### FASE 1 — Leitura e diagnóstico
Ler todos os arquivos listados na seção 1. Identificar quais dos problemas 3.1–3.10 já estão resolvidos e quais precisam de correção. **Não assumir — testar no código.**

### FASE 2 — Singleton do YT.Player (3.1)
Resolver a instância dupla. Criar o Context ou store compartilhado. Mover o container do iframe para `Player.tsx` como único ponto de montagem.

### FASE 3 — Play/Pause + autoplay ao ficar pronto (3.3)
Corrigir o `useEffect` que comanda `yt.play()/yt.pause()`. Adicionar autoplay em `onPlayerReady`. Implementar a flag `suppressStoreSync` para evitar loop (3.9).

### FASE 4 — Progresso + seek (3.2, 3.4)
Garantir que o polling atualize o estado de forma que cause re-render. Corrigir o seek com debounce.

### FASE 5 — Faixa termina → próxima (3.5)
Implementar `next()` em `onPlayerStateChange` para `ENDED`. Respeitar `repeat: 'one'`.

### FASE 6 — Volume (3.6)
Adicionar guarda `isReady` no `useEffect` de volume.

### FASE 7 — Visual: thumbnail estática no footer/mini player (3.7)
Substituir o iframe por `<img>` no footer e mini player.

### FASE 8 — Botões e badge (3.8)
Implementar `handlePrev` com restart. Adicionar badge "YT". Verificar botões desabilitados.

### FASE 9 — Troca de faixa (3.10)
Verificar o ciclo de vida do hook na troca de videoId. Garantir que `onPlayerReady` cuida do autoplay.

### FASE 10 — Verificação final
Testar o fluxo completo:
- [ ] Faixa Deezer toca normalmente (sem regressão)
- [ ] Faixa YouTube inicia ao clicar em play
- [ ] Play/Pause responde imediatamente
- [ ] Barra de progresso avança em tempo real (polling 500ms)
- [ ] Seek funciona — clicar na barra pula corretamente
- [ ] Volume funciona
- [ ] Faixa termina → avança para próxima
- [ ] Repeat 'one' reinicia o mesmo vídeo
- [ ] Trocar de faixa YouTube inicia o novo vídeo automaticamente
- [ ] Player expandido mostra o iframe do vídeo sem criar instância dupla
- [ ] Footer e mini player mostram thumbnail estática, não iframe
- [ ] Badge "YT" aparece nas faixas do YouTube
- [ ] Botão anterior faz restart se `currentTime > 3s`
- [ ] `npm run lint` passa
- [ ] `npm run build` passa

---

## 6. PERGUNTAS QUE VOCÊ DEVE ME FAZER ANTES DE IMPLEMENTAR

1. A sincronização de estado entre `NowPlaying` e `Player` deve usar **React Context** (mais leve) ou **store Zustand separado** (mais consistente com o padrão do projeto)? Recomendação: Context, dado que é estado efêmero de runtime — mas confirmar.

2. O badge "YT" deve aparecer também na fila (`NowPlaying`) ao lado de faixas YouTube? Ou apenas no footer?

3. Para o botão Anterior com restart: o limiar de 3 segundos está ok, ou prefere diferente (ex: 5s como o Spotify usa)?

4. Ao trocar para uma faixa YouTube enquanto uma faixa Deezer está tocando, o `<audio>` deve ser pausado imediatamente (já ocorre via `isYouTubeTrack` guard) — confirmar se há algum cenário onde o áudio do Deezer continua tocando em background junto com o vídeo YouTube.