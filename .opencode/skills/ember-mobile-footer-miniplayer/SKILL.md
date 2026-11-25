---
name: ember-mobile-footer-miniplayer
description: Audita e corrige o footer/player inferior da versão web mobile do Ember Music para oferecer uma experiência compacta, persistente e funcional inspirada no mini-player do Spotify Mobile.
---

# Ember Mobile Footer — Mini-player inferior

## Objetivo

Corrigir a experiência do footer/player na parte inferior da aplicação web mobile do Ember Music. O resultado deve funcionar como uma barra compacta de reprodução persistente, inspirada nos padrões de interação do Spotify Mobile, mas mantendo a identidade visual, os tokens, a marca e a arquitetura do Ember Music.

O alvo é a **versão web responsiva em navegador/PWA**. Não altere automaticamente o aplicativo nativo em `apps/mobile`; só faça isso se a solicitação mencionar explicitamente o app nativo.

Esta skill orienta a implementação/correção do código. Não se limita a criar um mockup.

## Princípio de implementação

Antes de criar outro player, audite o player existente. Reutilize estado, ações e componentes já existentes. Não crie um segundo motor de áudio, uma store paralela ou controles que apenas simulam reprodução.

O comportamento de play/pause, faixa atual, progresso, duração, volume, fila, fontes YouTube/áudio, expansão e persistência deve continuar ligado ao estado real do Ember Music.

## Contexto confirmado do repositório

Confirme novamente os arquivos na branch atual antes de editar, pois o código pode ter mudado.

- Layout global: `src/app/layout.tsx` — monta Topbar, Sidebar, MainContainer e `<Player />`.
- Player/footer: `src/components/Player/index.tsx`.
- Navegação mobile: `src/components/Sidebar/index.tsx`.
- Estado de player: `src/lib/store.ts`.
- Estado da sidebar/immersive: `src/lib/sidebar-store.ts`.
- Player expandido: `src/components/ExpandedPlayerModal/index.tsx`.
- Hero/background: `src/components/NowPlaying/index.tsx` e `src/components/Player/HeroBackground.tsx`.
- Tipos de música: `src/types/music.ts`.

Observações verificadas na implementação consultada:
- O footer vive globalmente no layout e usa a classe `player-footer`.
- `src/components/Player/index.tsx` tem dois modos: um ramo `miniPlayer` com footer mobile de `h-14 md:hidden` e um footer completo de `h-20`.
- O modo compacto já exibe capa, título, artista, play/pause e ações de expansão/minimização.
- O footer atual usa `z-[70]`; o comentário do componente registra que o ExpandedPlayerModal usa `z-[60]`.
- A Sidebar já implementa navegação inferior mobile. Portanto, a relação espacial entre mini-player, bottom navigation, conteúdo rolável, overlays e safe area precisa ser auditada antes de alterar posicionamento.
- O projeto usa React/Next.js, TypeScript, Tailwind e Motion (`motion/react`). Não presuma que GSAP esteja instalado ou que deva substituir Motion.

Essas observações são pontos de partida, não substituem a leitura atual dos componentes e stores.

## Referência de experiência

Use o padrão de mini-player do Spotify Mobile como referência funcional, não como cópia literal:
- Mini-player persistente e visualmente distinto do conteúdo rolável.
- Posicionado imediatamente acima da navegação inferior quando a navegação inferior estiver visível.
- Capa quadrada pequena à esquerda.
- Título da faixa e artista em duas linhas compactas, com truncamento seguro.
- Play/pause sempre acessível à direita.
- Progresso da faixa opcional, discreto e fino, integrado à borda superior ou inferior da barra se não competir com a informação principal.
- A barra inteira pode abrir o player expandido; controles internos devem executar suas próprias ações sem propagar o clique.
- Transição visual fluida entre mini-player e player expandido.
- Contraste e estados de foco/pressed claros.
- Aparência coerente com os tokens do Ember Music. Não introduza o verde, logotipo, ícones proprietários ou identidade do Spotify.

Referências de leitura:
- Spotify Design Guidelines: https://developer.spotify.com/documentation/design
- Exemplo de estrutura de mini-player: https://www.floow.design/blog/how-to-design-a-music-streaming-app
- Referência de interação com Now Playing inferior: https://community.spotify.com/forum/en/discussion/5491365/android-ux-consistency-for-android-spotify-and-ios

## Diagnóstico obrigatório

Antes de editar:

1. Leia `src/app/layout.tsx`, `src/components/Player/index.tsx`, `src/components/Sidebar/index.tsx`, stores relacionadas e player expandido.
2. Identifique qual elemento controla a navegação inferior mobile e se ela usa `fixed`, `sticky` ou fluxo normal.
3. Mapeie alturas reais, `position`, `z-index`, stacking contexts, bordas, backgrounds, safe areas e espaços reservados no conteúdo.
4. Verifique como `miniPlayer`, `isExpandedOpen`, `immersive` e `currentTrack` afetam a renderização.
5. Verifique os estados sem faixa carregada, carregando, tocando, pausado, erro e mudança de faixa.
6. Inspecione os breakpoints usados no projeto; não presuma que `md` corresponde ao comportamento desejado sem verificar.
7. Registre o diagnóstico e um plano curto antes de modificar arquivos.

Se o problema não estiver claro visualmente, peça screenshot da versão mobile ou use o navegador disponível para inspecionar o site. Não invente defeitos que não foram observados.

## Diretrizes de layout mobile

### Composição e posicionamento
- Mini-player deve ficar diretamente acima da bottom navigation, sem cobri-la nem deixar um vão artificial.
- Bottom navigation permanece independente e clicável.
- Não deixe o mini-player sobrepor conteúdo, botões de ação, campos, listas ou o player expandido.
- Reserve no conteúdo inferior o espaço necessário para mini-player + navegação + safe area, de acordo com a estratégia real de posicionamento.
- Considere `env(safe-area-inset-bottom)` e viewport dinâmica em PWA/mobile.
- Evite somar safe area duas vezes quando a bottom navigation já a incorpora.
- Se o layout usa footer no fluxo flex, não converta para `fixed` sem avaliar o impacto na altura do MainContainer e na navegação.
- Evite `position: fixed` duplicado em footer e bottom nav. Defina uma hierarquia única e documentada.
- Mantenha o footer visível em rotas que devem preservar a reprodução, inclusive durante navegação.

### Conteúdo e hierarquia
- Capa: proporção 1:1, sem distorção, com fallback quando imagem ausente.
- Título e artista: `min-width: 0`, truncamento por linha, sem empurrar o botão de play para fora.
- Play/pause: estado derivado do store real, com nome acessível dinâmico.
- Barra de progresso: só exiba se os dados de progresso/duração forem confiáveis e a interação não comprometer a ergonomia. Se for interativa, preserve seek, teclado e pointer handling existentes.
- Botões adicionais (like, próximo, dispositivo, fila) só entram se houver espaço e ação real já implementada; priorize capa, metadados e play/pause.
- A área clicável para abrir o player expandido não pode interceptar os controles internos.

### Estados
Defina explicitamente a apresentação para:
- Nenhuma faixa: não renderizar mini-player vazio, a menos que exista estado de produto intencional.
- Faixa carregada e pausada.
- Reprodução ativa.
- Carregamento/buffering, se a store expuser esse estado.
- Mudança de faixa e troca de fonte (YouTube / áudio).
- Imagem ausente ou quebrada.
- Título/artista muito longos.
- Player expandido aberto, immersive/fullscreen e drawer/menu abertos.

## Interação e acessibilidade

- Toda ação deve ser funcional, sem handlers decorativos.
- Play/pause deve chamar a ação existente da store.
- Tocar na área de conteúdo/capa abre o player expandido conforme o fluxo atual.
- Cliques em play/pause e outros botões internos não devem abrir/fechar o player por propagação acidental.
- Forneça `aria-label`, `aria-pressed` quando aplicável, foco visível e semântica de botão.
- Alvos de toque de preferência com pelo menos 44 × 44 CSS px.
- Não dependa de hover para revelar controles.
- Respeite reduced motion e não bloqueie scroll nativo.
- Se adicionar gesto swipe, ele deve ser opcional e nunca ser o único caminho para abrir/fechar o player.

## Motion e uso do GSAP

A primeira escolha deve ser a solução de motion já usada no componente. O projeto usa `motion/react`; não introduza GSAP só para animar um simples hover, fade ou scale.

Se GSAP oferecer benefício real para a transição entre mini-player e player expandido:
1. Leia `.opencode/skills/gsap-global/SKILL.md`.
2. Delegue para `.opencode/skills/gsap-core-motion/SKILL.md` para tween/timeline.
3. Leia `.opencode/skills/gsap-react-frameworks/SKILL.md` para refs, lifecycle, cleanup e React/Next.
4. Leia `.opencode/skills/gsap-interaction-flip/SKILL.md` se houver transição de layout/elemento compartilhado usando Flip.
5. Leia `.opencode/skills/gsap-quality-performance/SKILL.md` para mobile, reduced motion e desempenho.
6. Consulte a documentação oficial atual antes de implementar.

Não misture GSAP e Motion controlando simultaneamente a mesma propriedade/elemento. Escolha um único responsável pela animação. Garanta cleanup/revert ao desmontar e ao trocar de rota/estado.

## Desktop e tablet

- Preserve a experiência desktop existente, incluindo os clusters de metadados, controles centrais, progresso, volume, fila e expansão.
- Não transforme o footer desktop em mini-player mobile.
- Use breakpoints para compor variantes sem duplicar lógica de reprodução.
- Teste larguras intermediárias para evitar colunas comprimidas ou controles quebrados.
- Não altere a lógica de layout da Sidebar desktop sem necessidade.

## Plano de teste obrigatório

Teste no mínimo:
- 320 × 640
- 360 × 800
- 375 × 812
- 390 × 844
- 414 × 896
- 430 × 932
- tablet e desktop (incluindo 768px, 1024px e 1440px quando possível)

Verifique:
- mini-player imediatamente acima da navegação inferior;
- safe area em iOS/PWA e Android;
- ausência de sobreposição com conteúdo e controles;
- navegação inferior continua clicável;
- abrir/fechar player expandido;
- play/pause e troca de faixa reais;
- progresso/seek, se presente;
- mudança de rota sem desmontar indevidamente a reprodução;
- drawer, modais, toast e sleep timer sem conflito de camadas;
- teclado/foco e reduced motion;
- console, TypeScript, lint, testes e build disponíveis.

Use browser/Firecrawl para inspeção visual quando possível. Se um estado exigir autenticação ou interação que a ferramenta não consiga realizar, documente a limitação e não declare que foi testado.

## Critérios de aceite

- Footer mobile compacto, persistente e visualmente organizado.
- Posicionado sem lacuna sobre a bottom navigation.
- Capa, título, artista e play/pause legíveis e acessíveis.
- Nenhum conflito de z-index, safe area, scroll ou hit-area.
- Estado visual sincronizado com a reprodução real.
- Player expandido continua acessível e funcional.
- Desktop permanece intacto.
- Sem lógica duplicada, dependências desnecessárias ou animações concorrentes.

## Entrega

Ao terminar, informe:
1. causa raiz dos problemas encontrados;
2. arquivos alterados;
3. decisões de layout e interação;
4. uso de Motion/GSAP e skills secundárias acionadas;
5. viewports e estados realmente testados;
6. limitações que ainda dependem de teste manual.

Não faça commit, merge ou deploy sem autorização explícita. Se o pedido for apenas para criar esta skill, não modifique os componentes da aplicação.
