# ENGENHARIA DE PROMPT — EMBER MUSIC
## Integração de pesquisa do YouTube com cache inteligente, reprodução, favoritos e álbuns/playlists

Você é um engenheiro de software sênior responsável por implementar uma nova fonte de música no projeto existente **Ember Music**.




Repositório:

`henrisantana07/ember-music`

Antes de alterar qualquer arquivo, analise o código existente e preserve a arquitetura, identidade visual e funcionalidades atuais.

---

### Regra importante — Reutilização da UI e funcionalidades existentes

Antes de criar qualquer novo botão, componente, modal ou fluxo de interação, **analise os componentes já existentes no projeto**.

Se o Ember Music já possuir uma funcionalidade equivalente, **reaproveite o componente, botão, modal, store ou função existente**, adaptando-o somente quando necessário para suportar o YouTube.

**Não criar funcionalidades duplicadas.**

Exemplos:

- Se já existe botão de **Favoritar**, reutilizar o mesmo botão e sua lógica atual.
- Se já existe botão de **Adicionar à playlist/álbum**, reutilizar o mesmo componente/modal existente.
- Se já existe botão de **Play**, reutilizar o botão e integrar o YouTube à lógica existente do player.
- Se já existe botão de **Mais opções**, reutilizar o mesmo menu.
- Se já existe componente de **resultado de música/faixa**, estender esse componente para aceitar `source: 'deezer' | 'youtube'`.
- Se já existe modal de seleção de playlist, reutilizar o modal existente.
- Se já existe Zustand store ou função responsável por favoritos/playlists, reutilizar a estrutura atual em vez de criar uma segunda store.
- Se já existe sistema de histórico, debounce, loading, skeleton ou tratamento de erro, reutilizá-lo.
- Se já existe componente visual equivalente, **não criar outro componente visual apenas para o YouTube**.

### Regra de integração

O objetivo é fazer o YouTube parecer uma **nova fonte de conteúdo dentro do Ember Music**, e não criar uma segunda aplicação dentro do projeto.

A implementação deve seguir:

```text
Funcionalidade já existente?
        ↓
      SIM
        ↓
Reutilizar/adaptar componente existente
        ↓
Adicionar suporte ao YouTube
```

Somente criar um novo componente quando **não existir nenhum componente equivalente no projeto**.

Antes de implementar, faça uma análise dos componentes existentes e identifique quais podem ser reutilizados. Na implementação final, mantenha a arquitetura e o padrão visual atual do Ember Music.

### Regra adicional para botões

Não adicionar novos botões de:

- ▶️ Play
- ❤️ Favoritar
- ➕ Adicionar à playlist
- ⋮ Mais opções
- 📀 Álbum
- qualquer outra ação já disponível

caso essas ações já estejam implementadas no projeto.

Em vez disso, **estenda a lógica dos botões existentes para reconhecer tanto faixas Deezer quanto faixas YouTube**.

Exemplo conceitual:

```ts
type TrackSource = 'deezer' | 'youtube'

interface Track {
  id: string
  source: TrackSource
  title: string
  artist: string
  album?: string
  cover?: string
  audio?: string | null
  youtubeVideoId?: string
}
```

O mesmo botão de Play deverá decidir internamente como reproduzir:

```text
Deezer
→ player de áudio existente

YouTube
→ player oficial/embutido do YouTube
```

O mesmo botão de Favoritar deverá funcionar para:

```text
Deezer Track
+
YouTube Track
```

E o mesmo sistema de playlists deverá permitir:

```text
Playlist
├── Música Deezer
├── Música Deezer
├── Música YouTube
└── Música YouTube
```

### Critério de aceitação

# 1. CONTEXTO REAL DO PROJETO

O projeto atualmente utiliza:

- Next.js 16.2.9
- React 19
- TypeScript
- Zustand
- Supabase
- Tailwind CSS
- Lucide React
- Vitest
- Deezer API através de `/api/deezer`
- Player global em `src/components/Player/index.tsx`
- Estado global do player em `src/lib/store.ts`
- Página de pesquisa em `src/app/buscar/page.tsx`
- Interface principal de pesquisa em `src/components/explore/ExplorePage.tsx`
- Resultados de faixas em `src/components/explore/TrackResultGrid.tsx`
- Histórico de pesquisa em `src/lib/search-history.ts`
- Favoritos já persistidos em Supabase
- Playlists/álbuns do usuário já persistidos em Supabase

O projeto também possui:

- `/src/app/albums/[id]`
- `/src/app/playlists/[id]`
- `/src/components/PlaylistModal`
- `/src/components/SaveAlbumButton.tsx`
- `/src/lib/playlists-store.ts`
- `/src/components/Player`
- `/src/app/reproducao`

NÃO recrie funcionalidades que já existem.

NÃO substitua o Deezer.

A nova integração deve coexistir com a fonte atual.

---

# 2. OBJETIVO PRINCIPAL

Adicionar uma nova fonte de resultados chamada:

**YouTube**

A barra de pesquisa do Ember Music deve conseguir pesquisar músicas no YouTube através da **YouTube Data API oficial**, utilizando uma arquitetura otimizada para consumir o mínimo possível de quota.

O resultado deve aparecer integrado à experiência atual do Ember Music.

O usuário deve conseguir:

1. pesquisar uma música/artista;
2. visualizar resultados do YouTube;
3. reproduzir a faixa através de um mecanismo permitido pelo YouTube;
4. adicionar a faixa aos favoritos;
5. adicionar a faixa a uma playlist/álbum criado pelo usuário;
6. visualizar posteriormente essa faixa na biblioteca/playlist;
7. reproduzir novamente a faixa salva;
8. continuar utilizando normalmente os resultados do Deezer.

---

# 3. REGRA FUNDAMENTAL — NÃO FAZER SCRAPING

NÃO utilizar:

- scraping do YouTube;
- yt-dlp;
- youtube-dl;
- Invidious;
- Piped;
- APIs não oficiais para extrair áudio;
- conversores YouTube → MP3;
- download direto do áudio;
- extração do stream de áudio do YouTube;
- proxy de áudio do YouTube;
- URLs internas de streaming do YouTube;
- técnicas para remover anúncios;
- técnicas para reproduzir áudio escondendo o player do YouTube.

Utilizar somente APIs/mecanismos oficiais e permitidos pelo YouTube.

A reprodução deve respeitar as políticas e requisitos do YouTube.

Se a reprodução de determinado formato não puder ser feita legalmente através do mecanismo oficial, NÃO tentar contornar a limitação.

Nesse caso, apresentar uma alternativa segura, como abrir/reproduzir o conteúdo através do player oficial/embedded permitido.

---

# 4. ARQUITETURA DE PESQUISA

Criar um endpoint server-side:

`/api/youtube/search`

A chave da API deve ficar exclusivamente no servidor.

Nunca expor:

`YOUTUBE_API_KEY`

no client bundle.

Utilizar:

`.env.local`

com:

```env
YOUTUBE_API_KEY=...
```

Criar também uma validação clara para quando a variável não existir.

---

# 5. FLUXO DA PESQUISA

O fluxo deverá ser:

```text
Usuário digita
      ↓
Debounce
      ↓
Normalização da pesquisa
      ↓
Verificação de cache
      ↓
Existe cache válido?
   ↙          ↘
 SIM          NÃO
  ↓             ↓
retorna      verifica
cache        rate limit
                ↓
          YouTube API
                ↓
             cache
                ↓
             usuário
```

---

# 6. DEBOUNCE

A pesquisa NÃO deve consultar a API a cada caractere digitado.

Exemplo:

```text
B
Bi
Bil
Bill
Billi
Billie
Billie Eilish
```

Não fazer 7 chamadas.

Implementar debounce entre:

**500–700 ms**

Preferência:

**600 ms**

A API só deve ser chamada depois que o usuário parar de digitar.

---

# 7. NORMALIZAÇÃO DA QUERY

Antes de consultar ou procurar no cache:

- remover espaços duplicados;
- remover espaços no início/fim;
- normalizar case para comparação;
- gerar uma chave determinística.

Exemplo:

```text
"  Billie   Eilish  "
```

vira:

```text
"billie eilish"
```

A chave do cache pode ser:

```text
youtube:search:billie-eilish
```

ou uma versão com hash seguro.

---

# 8. CACHE — PRIORIDADE MÁXIMA

A prioridade é reduzir drasticamente chamadas à YouTube Data API.

NÃO utilizar somente:

```ts
Map()
```

em memória como mecanismo principal.

Isso não é suficiente em produção/serverless porque diferentes instâncias podem possuir memórias diferentes.

Preferir um cache compartilhado.

Como o projeto já utiliza Supabase, analisar primeiro a possibilidade de implementar uma tabela própria para cache.

Exemplo conceitual:

```sql
youtube_search_cache
```

Campos:

```text
id
query_key
query
results
created_at
expires_at
```

Criar índice em:

```text
query_key
expires_at
```

O cache deve ser global para pesquisas públicas, e NÃO separado por usuário.

Assim:

```text
Usuário A pesquisa:

billie eilish

↓
YouTube API

cache:
billie eilish

↓

Usuário B pesquisa:

Billie Eilish

↓

mesmo cache

↓

0 chamadas adicionais
```

---

# 9. TTL DO CACHE

Usar inicialmente:

**6 horas**

para resultados de pesquisa do YouTube.

Não apagar imediatamente após cada pesquisa.

O objetivo é reutilizar resultados.

Exemplo:

```text
10:00
pesquisa → API

10:05
mesma pesquisa → cache

11:30
mesma pesquisa → cache

15:00
mesma pesquisa → cache

16:01
cache expirado

16:02
nova consulta à API
```

IMPORTANTE:

A expiração do cache NÃO reseta quota.

O cache serve apenas para evitar novas chamadas.

Respeitar os termos e políticas atuais da YouTube API quanto ao armazenamento de API Data.

Não armazenar dados indefinidamente.

---

# 10. STALE-WHILE-REVALIDATE

Quando possível, implementar:

```text
cache válido
      ↓
retorna imediatamente
```

Quando estiver próximo de expirar:

```text
retorna cache
      +
revalidação em background
```

Mas NÃO permitir que múltiplos usuários provoquem múltiplas chamadas simultâneas para a mesma query.

Implementar proteção contra:

**cache stampede**

---

# 11. REQUEST DEDUPLICATION

Se 50 usuários pesquisarem simultaneamente:

```text
Billie Eilish
```

e não existir cache:

NÃO fazer:

```text
50 → YouTube API
```

Fazer:

```text
50 usuários
     ↓
1 request em andamento
     ↓
YouTube API
     ↓
resultado
     ↓
cache
     ↓
50 usuários
```

Implementar deduplicação de requests/in-flight promise ou mecanismo equivalente compatível com o ambiente de execução.

---

# 12. RATE LIMIT

Criar rate limit próprio para o endpoint:

```text
/api/youtube/search
```

Não confiar somente no rate limit do YouTube.

Implementar limite por IP e, quando o usuário estiver autenticado, também considerar o usuário.

Exemplo inicial:

```text
20 pesquisas/minuto por IP
```

e:

```text
30 pesquisas/minuto por usuário autenticado
```

Os valores devem ficar centralizados em constantes/configuração para fácil alteração.

Retornar:

```http
429 Too Many Requests
```

com:

```http
Retry-After
```

quando necessário.

---

# 13. LIMITE DE RESULTADOS

Não buscar centenas de resultados.

Para a pesquisa inicial:

```text
maxResults = 10
```

Preferência por poucos resultados relevantes.

A paginação do YouTube só deve ser realizada quando o usuário realmente solicitar mais resultados.

NÃO pré-carregar páginas adicionais.

---

# 14. NÃO FAZER PESQUISA DUPLA DESNECESSÁRIA

Evitar:

```text
search.list
+
videos.list
+
channels.list
+
playlists.list
```

para cada pesquisa sem necessidade.

Utilizar os dados retornados pelo endpoint de pesquisa sempre que forem suficientes.

Se for necessário `videos.list`, solicitar apenas os IDs relevantes e somente os campos necessários.

Evitar chamadas adicionais apenas para preencher informações cosméticas.

---

# 15. TIPAGEM

Expandir `src/types/music.ts` sem quebrar o tipo `Track` existente.

Criar algo semelhante a:

```ts
export type TrackSource = 'deezer' | 'youtube'
```

e adicionar ao modelo de faixa um identificador de origem.

Exemplo:

```ts
source?: TrackSource
```

Para YouTube, armazenar somente identificadores/metadados necessários.

Exemplo:

```ts
youtubeVideoId?: string
youtubeChannelId?: string
youtubeUrl?: string
```

Não armazenar URL de stream de áudio.

---

# 16. MODELO DE FAIXA DO YOUTUBE

Criar uma função de normalização:

```ts
mapYouTubeTrack()
```

A saída deve ser compatível com o modelo utilizado pelo player.

Exemplo conceitual:

```ts
{
  id: `youtube:${videoId}`,
  source: 'youtube',
  youtubeVideoId: videoId,
  name: title,
  artist_name: channelTitle,
  artist_id: channelId,
  album_id: '',
  album_name: '',
  image: thumbnailUrl,
  duration: duration,
  audio: null,
  url: youtubeWatchUrl
}
```

IMPORTANTE:

Para YouTube:

```ts
audio: null
```

Não preencher `audio` com URL extraída do YouTube.

---

# 17. IDENTIFICADOR ÚNICO

O ID da faixa deve evitar colisão entre fontes.

Deezer:

```text
123456
```

YouTube:

```text
youtube:dQw4w9WgXcQ
```

Assim, uma música do Deezer e um vídeo do YouTube nunca serão tratados como a mesma entidade acidentalmente.

---

# 18. RESULTADOS NA BARRA/PÁGINA DE PESQUISA

Modificar:

```text
src/components/explore/ExplorePage.tsx
src/components/explore/ExploreResults.tsx
src/components/explore/TrackResultGrid.tsx
```

sem destruir a implementação existente.

Criar uma seção visual:

```text
Resultados do YouTube
```

ou integrar através de uma aba:

```text
Tudo | Músicas | Álbuns | Artistas | YouTube
```

Preferência:

Adicionar uma seção dedicada:

```text
YouTube
────────────────────────

[thumbnail] Música
           Artista/canal
           duração

[▶] [♡] [...]
```

Manter os resultados Deezer funcionando normalmente.

---

# 19. RESULTADO DO YOUTUBE

Cada resultado deverá possuir:

- thumbnail;
- título;
- artista/canal;
- duração quando disponível;
- indicação discreta de origem:
  `YouTube`;
- botão Play;
- botão Favoritar;
- botão Adicionar à playlist;
- menu de ações.

Não copiar visualmente o YouTube.

O componente deve continuar seguindo a identidade visual do Ember Music.

---

# 20. REPRODUÇÃO

O player atual utiliza:

```text
src/components/Player/index.tsx
```

e:

```text
src/lib/store.ts
```

Atualmente ele utiliza `<audio>` para URLs de áudio.

Isso não deve ser quebrado.

Implementar suporte a dois tipos:

```text
Deezer/Jamendo/áudio normal
        ↓
HTMLAudioElement

YouTube
        ↓
player oficial/embedded permitido pelo YouTube
```

Criar uma abstração de playback.

Exemplo conceitual:

```ts
type PlaybackSource =
  | { type: 'audio'; url: string }
  | { type: 'youtube'; videoId: string }
```

O player deve detectar:

```ts
currentTrack.source
```

---

# 21. PLAYER YOUTUBE

Não utilizar:

```html
<audio src="youtube-url">
```

Não tentar transformar o vídeo em áudio.

Quando uma faixa YouTube for selecionada:

```text
Track
 ↓
source === 'youtube'
 ↓
youtubeVideoId
 ↓
YouTube embedded player oficial
```

O componente pode ficar visualmente integrado ao Ember Music, mas não deve esconder ou manipular indevidamente elementos obrigatórios do player do YouTube.

Se alguma funcionalidade do player atual não puder ser reproduzida para YouTube, adaptar a UI em vez de realizar workaround não autorizado.

---

# 22. CONTROLES DO PLAYER

Manter os controles atuais para faixas compatíveis.

Para YouTube, avaliar individualmente:

- play/pause;
- próxima;
- anterior;
- volume;
- progresso;
- seek;
- duração;
- fila;
- shuffle;
- repeat.

Não fingir que um controle funciona quando a API/player oficial não o permite.

O estado global do Zustand deve continuar sendo a fonte principal da fila e faixa atual.

---

# 23. FAVORITOS

O projeto já possui:

```text
public.favorites
```

e:

```text
unique(user_id, track_id)
```

Não criar uma segunda tabela de favoritos.

Reutilizar:

```text
favorites
```

Quando o usuário favoritar um resultado YouTube:

```text
track_id = youtube:<videoId>
track_data = objeto normalizado da faixa
```

Exemplo:

```json
{
  "source": "youtube",
  "youtubeVideoId": "abc123",
  "name": "Nome da música",
  "artist_name": "Artista",
  "image": "thumbnail..."
}
```

O favorito deve continuar funcionando mesmo após atualizar a página.

---

# 24. FAVORITOS NO RESULTADO

O coração deve possuir três estados:

```text
♡ não favoritado

♥ favoritado

⌛ salvando
```

Não permitir múltiplos inserts simultâneos.

Usar optimistic UI somente se o rollback estiver corretamente implementado.

Em caso de erro:

```text
reverter estado
+
toast de erro
```

---

# 25. ADICIONAR À PLAYLIST/ÁLBUM DO USUÁRIO

O projeto já possui:

```text
PlaylistModal
```

e:

```text
playlist_tracks
```

Reutilizar essas estruturas.

O usuário deve poder clicar:

```text
+
```

em uma faixa YouTube.

Abrir:

```text
PlaylistModal
```

Mostrar as playlists existentes do usuário.

Permitir:

```text
Adicionar à playlist
```

Salvar:

```text
playlist_id
track_id = youtube:<videoId>
track_data = faixa completa
position
added_at
```

---

# 26. PLAYLISTS MISTAS

As playlists devem poder conter:

```text
Deezer
+
YouTube
+
outras fontes suportadas
```

Não criar uma playlist separada exclusivamente para YouTube.

Ao abrir uma playlist:

```text
playlist_tracks
       ↓
track_data
       ↓
normalização
       ↓
player
```

Cada faixa deve manter sua origem.

---

# 27. ÁLBUMS CRIADOS PELO USUÁRIO

O projeto atualmente utiliza playlists como estrutura persistente para coleções criadas pelo usuário.

NÃO criar uma segunda arquitetura de banco desnecessária.

Se o conceito de "álbum criado pelo usuário" já estiver implementado como playlist/coleção, reutilizar a estrutura existente.

Se realmente houver uma tela específica de álbuns personalizados, integrar os resultados YouTube ao modelo existente em vez de duplicar tabelas.

---

# 28. SAVE ALBUM

Não alterar o comportamento atual do:

```text
SaveAlbumButton.tsx
```

para álbuns Deezer sem necessidade.

Para resultados YouTube, lembrar que um resultado de pesquisa do YouTube normalmente representa um vídeo/faixa, não necessariamente um álbum oficial.

Não inventar dados de álbum.

Quando não houver álbum real:

```text
album_id: ''
album_name: ''
```

ou equivalente seguro.

---

# 29. BIBLIOTECA

Na biblioteca do usuário:

```text
Favoritos
Playlists
Histórico
```

as faixas YouTube devem aparecer normalmente quando armazenadas.

Mostrar um pequeno indicador:

```text
YouTube
```

quando necessário para deixar claro a origem.

---

# 30. HISTÓRICO DE PESQUISA

Reutilizar:

```text
src/lib/search-history.ts
```

A pesquisa:

```text
Billie Eilish
```

deve ser salva uma única vez por ação de pesquisa, e não a cada tecla digitada.

Não salvar:

```text
B
Bi
Bil
Bill
...
```

Salvar somente a query final.

---

# 31. CACHE DE PESQUISA NÃO DEVE DEPENDER DO HISTÓRICO DO USUÁRIO

Separar claramente:

```text
search_history
```

de:

```text
youtube_search_cache
```

Histórico:

privado do usuário.

Cache:

global/compartilhado e controlado pelo servidor.

Nunca misturar os dois.

---

# 32. TRATAMENTO DE QUOTA

Criar uma camada:

```text
youtube-service.ts
```

responsável por:

- chamar API;
- normalizar resultados;
- cache;
- deduplicação;
- tratamento de erros;
- quota/rate-limit;
- logging.

O componente React NÃO deve chamar diretamente a API do YouTube.

Arquitetura:

```text
React
 ↓
/api/youtube/search
 ↓
youtube-service
 ↓
cache
 ↓
YouTube API
```

---

# 33. ERROS DA API

Tratar especificamente:

```text
401
403
429
500
503
```

Mensagens amigáveis.

Exemplo:

```text
YouTube está temporariamente indisponível.
Tente novamente em alguns instantes.
```

Nunca exibir:

```text
YOUTUBE_API_KEY
```

ou detalhes secretos no frontend.

---

# 34. QUOTA EXCEDIDA

Se a API informar quota excedida:

```text
Não continuar tentando automaticamente.
```

Não fazer retry agressivo.

Retornar um erro controlado.

O sistema deve continuar permitindo:

```text
pesquisa Deezer
biblioteca local
favoritos
playlists
```

sem ficar completamente indisponível.

---

# 35. RETRY

Somente fazer retry automático para erros transitórios como:

```text
500
502
503
504
```

Utilizar no máximo:

```text
1–2 retries
```

com backoff.

NÃO fazer retry para:

```text
403 quotaExceeded
```

---

# 36. OBSERVABILIDADE

Adicionar logs server-side controlados:

```text
youtube.search.cache_hit
youtube.search.cache_miss
youtube.search.api_request
youtube.search.rate_limited
youtube.search.error
```

Não registrar:

- API key;
- tokens;
- cookies;
- dados pessoais desnecessários.

Se possível, incluir métricas:

```text
cache hit rate
cache miss rate
API calls
429 count
quota errors
```

---

# 37. CONFIGURAÇÕES CENTRALIZADAS

Criar constantes:

```ts
YOUTUBE_SEARCH_CACHE_TTL
YOUTUBE_SEARCH_DEBOUNCE_MS
YOUTUBE_SEARCH_MAX_RESULTS
YOUTUBE_SEARCH_RATE_LIMIT
YOUTUBE_SEARCH_RATE_WINDOW
```

Não espalhar números mágicos pelo projeto.

---

# 38. SEGURANÇA

Validar:

```text
query
limit
pageToken
```

no servidor.

Impor tamanho máximo para:

```text
query
```

Exemplo:

```text
100 caracteres
```

Evitar abuso do endpoint.

Não permitir que o usuário escolha livremente parâmetros capazes de aumentar significativamente o consumo da API.

---

# 39. PAGINAÇÃO

A primeira chamada:

```text
maxResults=10
```

Guardar `nextPageToken` somente se necessário e permitido pela política de armazenamento.

Só realizar nova consulta quando o usuário clicar:

```text
Ver mais
```

Nunca carregar todas as páginas automaticamente.

---

# 40. PERFORMANCE

A implementação deve:

- preservar SSR/CSR adequado;
- não bloquear a interface;
- utilizar skeleton existente;
- evitar re-render desnecessário;
- não disparar efeitos duplicados;
- cancelar requests antigos quando o usuário muda rapidamente a query;
- evitar race conditions.

Exemplo:

```text
Pesquisa A
    ↓
request A

usuário muda para B

request A deve ser ignorado/cancelado

request B
```

Nunca permitir que resultado antigo sobrescreva resultado novo.

---

# 41. COMPATIBILIDADE COM O PLAYER EXISTENTE

Não reescrever completamente:

```text
src/lib/store.ts
```

sem necessidade.

Adicionar suporte à nova origem de forma incremental.

Preservar:

- queue;
- shuffle;
- repeat;
- progress;
- volume;
- mini player;
- playlist context;
- persistência do player.

---

# 42. TESTES

Criar testes Vitest para:

### Normalização

```text
" Billie   Eilish "
→
"billie eilish"
```

### Cache

```text
primeira pesquisa → API
segunda pesquisa → cache
```

### Expiração

```text
cache expirado → API
```

### Deduplicação

```text
3 requests simultâneos
→ 1 chamada externa
```

### Rate limit

```text
limite atingido
→ 429
```

### ID

```text
youtube:VIDEO_ID
```

### Favorito

```text
YouTube track → favorites
```

### Playlist

```text
YouTube track → playlist_tracks
```

### Player

```text
Deezer track → audio player
YouTube track → YouTube player
```

---

# 43. BANCO DE DADOS

Antes de criar migration, verificar todas as migrations existentes.

Não duplicar:

```text
favorites
playlists
playlist_tracks
search_history
```

Criar nova migration somente se necessário.

Se criar:

```text
youtube_search_cache
```

definir:

- índices;
- TTL lógico;
- estrutura JSONB;
- tamanho controlado;
- política de acesso apropriada.

O cache não deve ficar diretamente acessível ao usuário final se não for necessário.

Preferir acesso server-side.

---

# 44. NEXT.JS 16

O arquivo:

```text
AGENTS.md
```

informa explicitamente que esta versão do Next.js possui mudanças importantes.

Antes de escrever código:

1. verificar as convenções atuais do Next.js 16;
2. verificar a documentação local disponível;
3. não utilizar APIs depreciadas;
4. respeitar App Router;
5. respeitar Server/Client Components;
6. manter secrets no servidor.

---

# 45. NÃO QUEBRAR O DEEZER

Após implementar YouTube, testar:

```text
Deezer search
Deezer playback
Deezer favorites
Deezer playlists
Deezer albums
```

Tudo deve continuar funcionando.

O usuário deve conseguir misturar:

```text
Deezer → faixa A
YouTube → faixa B
Deezer → faixa C
YouTube → faixa D
```

na mesma fila quando tecnicamente suportado.

---

# 46. UI/UX

Não transformar o Ember Music em uma cópia do YouTube Music.

Manter:

- identidade visual existente;
- variáveis CSS;
- tipografia;
- espaçamento;
- componentes;
- Lucide React;
- animações existentes.

Apenas adicionar a origem YouTube de forma natural.

Criar pequenos indicadores:

```text
YouTube
```

quando necessário.

---

# 47. ESTADO DE CARREGAMENTO

Durante pesquisa:

```text
Skeleton
```

já utilizado pelo Ember Music.

Não mostrar uma tela branca.

Durante reprodução:

```text
loading player
```

quando necessário.

Em erro:

```text
toast
```

sem quebrar o player global.

---

# 48. CRITÉRIO DE ACEITAÇÃO

A implementação só estará concluída quando:

[ ] usuário pesquisa uma música;

[ ] debounce funciona;

[ ] pesquisa não dispara chamada a cada caractere;

[ ] cache funciona;

[ ] mesma query reutiliza cache;

[ ] requests simultâneos são deduplicados;

[ ] API key não aparece no client;

[ ] rate limit funciona;

[ ] resultados YouTube aparecem;

[ ] resultado possui thumbnail;

[ ] resultado possui título;

[ ] resultado possui canal/artista;

[ ] usuário consegue iniciar reprodução usando mecanismo permitido;

[ ] player atual Deezer continua funcionando;

[ ] usuário consegue favoritar YouTube;

[ ] favorito persiste após reload;

[ ] usuário consegue adicionar YouTube a playlist;

[ ] playlist persiste após reload;

[ ] faixa YouTube aparece corretamente na playlist;

[ ] faixa pode ser reproduzida novamente;

[ ] histórico salva apenas a query final;

[ ] quota não é consumida por pesquisas repetidas dentro do TTL;

[ ] erros 403/429 são tratados;

[ ] não existe scraping;

[ ] não existe download de áudio do YouTube;

[ ] não existe extração de stream;

[ ] não existe bypass de anúncios/player;

[ ] testes passam;

[ ] lint passa;

[ ] build passa.

---

# 49. ORDEM DE IMPLEMENTAÇÃO

Implemente nesta ordem:

### FASE 1
Analisar arquitetura existente.

### FASE 2
Criar tipos YouTube.

### FASE 3
Criar `youtube-service`.

### FASE 4
Criar cache.

### FASE 5
Criar endpoint:

```text
/api/youtube/search
```

### FASE 6
Adicionar debounce na pesquisa.

### FASE 7
Adicionar resultados YouTube na UI.

### FASE 8
Integrar YouTube ao player.

### FASE 9
Integrar favoritos.

### FASE 10
Integrar PlaylistModal.

### FASE 11
Integrar playlists/biblioteca.

### FASE 12
Criar testes.

### FASE 13
Executar:

```bash
npm run lint
npm test
npm run build
```

Corrigir todos os erros.

---

# 50. REGRA FINAL PARA O AGENTE

NÃO faça uma reescrita geral do projeto.

NÃO substitua o Deezer.

NÃO crie uma arquitetura paralela sem necessidade.

NÃO remova funcionalidades existentes.

NÃO utilize APIs não oficiais do YouTube.

NÃO extraia áudio do YouTube.

NÃO tente burlar quota.

NÃO crie múltiplas API keys/projetos para contornar limites.

Priorize:

```text
baixo consumo de quota
+
cache compartilhado
+
deduplicação
+
debounce
+
rate limit
+
segurança
+
compatibilidade com a arquitetura atual
```

Antes de finalizar, faça uma revisão completa procurando:

- chamadas duplicadas;
- vazamento da API key;
- race conditions;
- cache incorreto;
- quota desnecessária;
- problemas de SSR;
- problemas de hidratação;
- problemas de reprodução;
- inconsistências de favoritos;
- inconsistências de playlists;
- regressões no Deezer.

Se uma funcionalidade solicitada não puder ser implementada de acordo com as políticas oficiais do YouTube, **não implemente um workaround**. Explique a limitação e implemente a alternativa oficial mais próxima.



### Regra importante — Reutilização da UI e funcionalidades existentes

Antes de criar qualquer novo botão, componente, modal ou fluxo de interação, **analise os componentes já existentes no projeto**.

Se o Ember Music já possuir uma funcionalidade equivalente, **reaproveite o componente, botão, modal, store ou função existente**, adaptando-o somente quando necessário para suportar o YouTube.

**Não criar funcionalidades duplicadas.**

Exemplos:

- Se já existe botão de **Favoritar**, reutilizar o mesmo botão e sua lógica atual.
- Se já existe botão de **Adicionar à playlist/álbum**, reutilizar o mesmo componente/modal existente.
- Se já existe botão de **Play**, reutilizar o botão e integrar o YouTube à lógica existente do player.
- Se já existe botão de **Mais opções**, reutilizar o mesmo menu.
- Se já existe componente de **resultado de música/faixa**, estender esse componente para aceitar `source: 'deezer' | 'youtube'`.
- Se já existe modal de seleção de playlist, reutilizar o modal existente.
- Se já existe Zustand store ou função responsável por favoritos/playlists, reutilizar a estrutura atual em vez de criar uma segunda store.
- Se já existe sistema de histórico, debounce, loading, skeleton ou tratamento de erro, reutilizá-lo.
- Se já existe componente visual equivalente, **não criar outro componente visual apenas para o YouTube**.

### Regra de integração

O objetivo é fazer o YouTube parecer uma **nova fonte de conteúdo dentro do Ember Music**, e não criar uma segunda aplicação dentro do projeto.

A implementação deve seguir:

```text
Funcionalidade já existente?
        ↓
      SIM
        ↓
Reutilizar/adaptar componente existente
        ↓
Adicionar suporte ao YouTube
```

Somente criar um novo componente quando **não existir nenhum componente equivalente no projeto**.

Antes de implementar, faça uma análise dos componentes existentes e identifique quais podem ser reutilizados. Na implementação final, mantenha a arquitetura e o padrão visual atual do Ember Music.

### Regra adicional para botões

Não adicionar novos botões de:

- ▶️ Play
- ❤️ Favoritar
- ➕ Adicionar à playlist
- ⋮ Mais opções
- 📀 Álbum
- qualquer outra ação já disponível

caso essas ações já estejam implementadas no projeto.

Em vez disso, **estenda a lógica dos botões existentes para reconhecer tanto faixas Deezer quanto faixas YouTube**.

Exemplo conceitual:

```ts
type TrackSource = 'deezer' | 'youtube'

interface Track {
  id: string
  source: TrackSource
  title: string
  artist: string
  album?: string
  cover?: string
  audio?: string | null
  youtubeVideoId?: string
}
```

O mesmo botão de Play deverá decidir internamente como reproduzir:

```text
Deezer
→ player de áudio existente

YouTube
→ player oficial/embutido do YouTube
```

O mesmo botão de Favoritar deverá funcionar para:

```text
Deezer Track
+
YouTube Track
```

E o mesmo sistema de playlists deverá permitir:

```text
Playlist
├── Música Deezer
├── Música Deezer
├── Música YouTube
└── Música YouTube
```

### Critério de aceitação

Ao finalizar, o projeto deve **parecer visualmente o mesmo Ember Music de antes**, apenas com suporte adicional ao YouTube.

Não quero:

- botões duplicados;
- modais duplicados;
- stores duplicadas;
- componentes duplicados;
- sistemas paralelos de favoritos;
- sistemas paralelos de playlists;
- dois players independentes sem necessidade;
- alteração desnecessária do layout existente.

Quero **integração**, não reconstrução.

Antes de criar qualquer arquivo novo, procure primeiro se já existe uma implementação equivalente que possa ser reutilizada ou estendida.