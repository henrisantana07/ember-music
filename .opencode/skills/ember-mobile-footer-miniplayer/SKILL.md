---
name: ember-mobile-footer-miniplayer
description: Audita e corrige o footer/player inferior da versão web mobile do Ember Music com layout de mini-player inspirado na referência visual enviada, preservando integralmente a identidade visual e as cores do Ember Music.
---

# Ember Mobile Footer — Mini-player inferior

## Objetivo

Corrigir a experiência do footer/player na parte inferior da aplicação web mobile do Ember Music. O resultado deve adotar a composição visual da referência enviada pelo usuário: um painel horizontal de reprodução com capa à esquerda, metadados na área superior, ação de adicionar no canto superior direito, progresso no meio e controles distribuídos na parte inferior.

A referência serve para orientar **estrutura, hierarquia e disposição dos controles**, não para copiar a identidade visual do Spotify. O resultado deve preservar as cores, tokens, tipografia, marca, ícones e arquitetura já existentes no Ember Music.

O alvo é a **versão web responsiva em navegador/PWA**. Não altere automaticamente o aplicativo nativo em `apps/mobile`; só faça isso se a solicitação mencionar explicitamente o app nativo.

Esta skill orienta a implementação/correção do código. Não se limita a criar um mockup.

## Direção visual obrigatória — novo modelo

Use a imagem enviada na conversa como referência principal de composição. O mini-player deve ter aparência de um painel horizontal compacto, com hierarquia visual semelhante à referência:

1. **Capa à esquerda:** imagem quadrada do álbum/faixa, com cantos arredondados e tamanho proporcional ao painel.
2. **Cabeçalho/metadados:** título da música em destaque e nome do artista abaixo, alinhados à esquerda da capa e ocupando a região superior.
3. **Ação no canto superior direito:** botão de adicionar/remover da biblioteca ou favoritos, conforme a ação real já existente no projeto. Use ícone e estado do Ember Music; não invente uma ação.
4. **Progresso:** trilho horizontal fino abaixo dos metadados, com indicador de posição e tempos decorrido/total em escala discreta. Só apresentar duração/progresso quando os dados forem válidos.
5. **Controles inferiores:** distribuir os controles em uma linha visualmente equilibrada, seguindo a referência: aleatório, faixa anterior, play/pause em destaque, próxima faixa e fila/mais opções. Mostrar apenas ações que já existam e sejam funcionais no Ember Music.
6. **Play/pause:** controle central com maior destaque visual e alvo de toque confortável; o estilo deve usar os tokens e cores do Ember Music, sem reproduzir o botão circular claro da referência se isso conflitar com a identidade do produto.

A composição deve continuar reconhecível em larguras pequenas. Em telas estreitas, reduza espaçamentos e dimensões de forma responsiva, sem remover a hierarquia principal. Se não houver espaço para todos os controles, priorize play/pause, anterior, próxima e ações secundárias já disponíveis; não permita overflow horizontal nem controles sobrepostos.

### Cores e identidade do Ember Music

- Antes de estilizar, inspecione os tokens e estilos globais atuais do Ember Music, incluindo variáveis CSS, tema, cores de superfície, texto, bordas, estados e gradientes usados nos componentes próximos ao player.
- Reutilize as cores reais já adotadas no projeto para background do painel, texto primário/secundário, trilho de progresso, thumb, botões e estados hover/pressed/focus.
- Preserve o contraste e a hierarquia da referência, mas **não use o verde do Spotify como cor de destaque** nem introduza paleta Spotify.
- Não copie o logotipo, os ícones proprietários, a tipografia ou outros elementos de marca do Spotify.
- Não invente novos valores hexadecimais quando houver tokens existentes adequados. Se faltar um token necessário, proponha uma extensão coerente com o tema atual e explique a decisão.
- Não altere a paleta global do aplicativo apenas para estilizar o mini-player.
- Mantenha consistência entre tema claro/escuro, se ambos forem suportados pelo projeto.

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

## Diagnóstico obrigatório

Antes de editar:

1. Leia `src/app/layout.tsx`, `src/components/Player/index.tsx`, `src/components/Sidebar/index.tsx`, stores relacionadas e player expandido.
2. Inspecione tokens de cor, tema, estilos globais e componentes que já definem superfícies, bordas e botões.
3. Identifique qual elemento controla a navegação inferior mobile e se ela usa `fixed`, `sticky` ou fluxo normal.
4. Mapeie alturas reais, `position`, `z-index`, stacking contexts, bordas, backgrounds, safe areas e espaços reservados no conteúdo.
5. Verifique como `miniPlayer`, `isExpandedOpen`, `immersive` e `currentTrack` afetam a renderização.
6. Verifique os estados sem faixa carregada, carregando, tocando, pausado, erro e mudança de faixa.
7. Confirme quais ações já estão implementadas: favorito/adicionar, shuffle, anterior, próxima, play/pause, fila e expansão. Não crie controles sem ação real.
8. Inspecione os breakpoints usados no projeto; não presuma que `md` corresponde ao comportamento desejado sem verificar.
9. Registre o diagnóstico e um plano curto antes de modificar arquivos.

Se o problema não estiver claro visualmente, peça screenshot da versão mobile ou use o navegador disponível para inspecionar o site. Não invente defeitos que não foram observados.

## Diretrizes de layout mobile

### Estrutura do painel

- O painel deve seguir a composição da referência: capa à esquerda; título/artista e ação de biblioteca na região superior; progresso no eixo horizontal; controles na região inferior.
- A capa deve permanecer visualmente separada dos controles, sem sobrepor texto ou trilho.
- Metadados devem ocupar a largura restante com `min-width: 0`, truncamento seguro e espaçamento consistente.
- O botão de biblioteca deve ficar no canto superior direito do bloco de metadados, sem reduzir excessivamente a largura do título.
- O progresso deve atravessar a área útil do painel, respeitando o espaço da capa conforme a composição responsiva escolhida.
- Os controles inferiores devem ser distribuídos de forma equilibrada. O play/pause deve ser o foco visual central.
- A altura do painel pode ser maior que a do mini-player anterior para acomodar as três regiões (metadados, progresso e controles). Defina a altura com base em testes reais, não mantenha obrigatoriamente o antigo `h-14`.
- Em larguras muito estreitas, adapte o tamanho da capa, espaçamentos, ícones e tipografia; mantenha todos os elementos dentro do painel.
- Não deixe o painel ocupar uma área desproporcional da viewport nem prejudicar a leitura do conteúdo.

### Posicionamento e navegação

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
- Título e artista: duas linhas compactas, `min-width: 0`, truncamento por linha, sem empurrar a ação superior para fora.
- Botão de biblioteca: estado visual sincronizado com a store real; use nome acessível dinâmico.
- Barra de progresso: exiba apenas se os dados de progresso/duração forem confiáveis. Se for interativa, preserve seek, teclado e pointer handling existentes.
- Controles inferiores: shuffle, anterior, play/pause, próxima e fila/mais opções, conforme ações existentes. Não simule funcionalidades ausentes.
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
- Favorito/adicionado e não adicionado.
- Player expandido aberto, immersive/fullscreen e drawer/menu abertos.

## Interação e acessibilidade

- Toda ação deve ser funcional, sem handlers decorativos.
- Play/pause deve chamar a ação existente da store.
- Shuffle, anterior, próxima, fila e favorito devem acionar exclusivamente os métodos já implementados e respeitar seus estados disponíveis.
- Tocar na área de conteúdo/capa abre o player expandido conforme o fluxo atual.
- Cliques nos controles internos não devem abrir/fechar o player por propagação acidental.
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
- Não transforme o footer desktop no painel mobile de três regiões.
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
- painel com capa, metadados, botão de biblioteca, progresso e controles;
- adaptação da composição em telas estreitas;
- cores e contraste usando tokens reais do Ember Music;
- mini-player imediatamente acima da navegação inferior;
- safe area em iOS/PWA e Android;
- ausência de sobreposição com conteúdo e controles;
- navegação inferior continua clicável;
- abrir/fechar player expandido;
- play/pause, shuffle, anterior, próxima e favorito reais, quando disponíveis;
- progresso/seek, se presente;
- mudança de rota sem desmontar indevidamente a reprodução;
- drawer, modais, toast e sleep timer sem conflito de camadas;
- teclado/foco e reduced motion;
- console, TypeScript, lint, testes e build disponíveis.

Use browser/Firecrawl para inspeção visual quando possível. Se um estado exigir autenticação ou interação que a ferramenta não consiga realizar, documente a limitação e não declare que foi testado.

## Critérios de aceite

- Footer mobile adota a nova composição da referência: capa à esquerda, metadados e ação de biblioteca no topo, progresso no meio e controles na parte inferior.
- Aparência usa exclusivamente a identidade visual e as cores do Ember Music; não imita a paleta ou marca do Spotify.
- Painel responsivo, sem overflow, sobreposição ou perda de legibilidade.
- Posicionado sem lacuna sobre a bottom navigation.
- Ações e estado visual sincronizados com a reprodução real.
- Player expandido continua acessível e funcional.
- Desktop permanece intacto.
- Sem lógica duplicada, dependências desnecessárias ou animações concorrentes.

## Entrega

Ao terminar, informe:
1. causa raiz dos problemas encontrados;
2. arquivos alterados;
3. decisões de layout e interação;
4. tokens/cores do Ember Music reutilizados;
5. uso de Motion/GSAP e skills secundárias acionadas;
6. viewports e estados realmente testados;
7. limitações que ainda dependem de teste manual.

Não faça commit, merge ou deploy sem autorização explícita. Se o pedido for apenas para criar ou atualizar esta skill, não modifique os componentes da aplicação.
