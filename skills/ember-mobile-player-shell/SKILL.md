---
name: ember-mobile-player-shell
description: Corrige a Topbar, a hero_reprodução (Now Playing/player expandido) e o footer/player fixo do Ember Music em navegadores mobile, alinhando hierarquia visual e usabilidade a padrões de streaming como Spotify Mobile, sem copiar sua identidade.
---

# Ember Music — Mobile Player Shell

## Objetivo

Auditar e aprimorar exclusivamente a experiência mobile de três áreas integradas do Ember Music:

1. **Topbar** — cabeçalho superior, marca, navegação contextual, busca e ações de conta.
2. **hero_reprodução** — tela/hero de reprodução, incluindo capa, metadados, fundo dinâmico, progresso, controles e fila quando aplicável.
3. **Footer / Player fixo** — barra inferior persistente, mini-player, controles compactos, expansão/recolhimento e convivência com a navegação inferior.

A direção visual deve remeter à clareza, densidade, hierarquia e ergonomia do Spotify Mobile, preservando a identidade Ember Music. Não reproduzir pixel a pixel a interface, logotipo, ícones proprietários, textos ou assets do Spotify.

O escopo é **mobile browser/PWA**. A experiência desktop deve permanecer intacta.

## Contexto confirmado do repositório

- Repositório: `henrisantana07/ember-music`.
- Stack raiz: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Motion e `lucide-react`.
- O layout raiz monta Topbar, Sidebar, MainContainer e Player em `src/app/layout.tsx`.
- Topbar atual: `src/components/Topbar/index.tsx`.
- Player/footer persistente: `src/components/Player/index.tsx`. O rodapé não foi localizado como componente independente; a UI do footer é renderizada pelo Player.
- Hero de reprodução: investigar em conjunto `src/components/NowPlaying/index.tsx`, `src/components/ExpandedPlayerModal/index.tsx` e `src/components/Player/HeroBackground.tsx`.
- Rota de reprodução: `src/app/reproducao/page.tsx`.
- Navegação mobile existente: `src/components/Sidebar/index.tsx`; não criar outra bottom navigation.
- A página pública observada é `https://ember-music-five.vercel.app`.
- A dependência `lucide-react` já existe. Reutilizar os ícones instalados; não adicionar biblioteca de ícones sem justificativa técnica.

Esses caminhos são pontos de partida confirmados, não uma lista fechada. Antes de editar, verificar a branch atual e reler o conteúdo integral dos arquivos na versão mais recente.

## Ferramentas obrigatórias

### GitHub
- Inspecionar branch, árvore, histórico e arquivos completos antes de propor mudanças.
- Rastrear todos os consumidores, stores, providers, hooks e estilos relacionados aos três componentes.
- Trabalhar em branch isolada, com commits pequenos e descritivos.
- Não substituir arquivos inteiros quando uma alteração localizada resolver o problema.
- Não abrir PR, fazer merge ou deploy sem autorização explícita.

### Firecrawl
- Inspecionar a aplicação publicada em viewport mobile e desktop.
- Capturar screenshots nas larguras de referência e, quando possível, inspecionar estados interativos: página comum, busca aberta, menu de conta, mini-player, hero expandida, fila e navegação.
- Comparar screenshots com o código da branch.
- Scraping estático pode não revelar conteúdo condicionado a autenticação, reprodução ativa ou estado client-side. Registrar essa limitação; não declarar um estado validado sem reproduzi-lo.

## Processo obrigatório

### 1. Diagnóstico antes de editar

Leia no mínimo:
- `src/app/layout.tsx` e `src/app/globals.css`;
- `src/components/Topbar/index.tsx`;
- `src/components/Player/index.tsx`;
- `src/components/NowPlaying/index.tsx`;
- `src/components/ExpandedPlayerModal/index.tsx`;
- `src/components/Player/HeroBackground.tsx`;
- `src/components/Sidebar/index.tsx`;
- stores e providers efetivamente usados por esses componentes, especialmente player, YouTube, sidebar e preferências;
- `src/components/MainContainer.tsx` e rota `src/app/reproducao/page.tsx`.

Mapeie:
- quem monta cada região e em quais rotas;
- breakpoints e regras `hidden`, `md:`, `lg:`;
- alturas, posições `fixed/sticky/absolute`, scroll containers e safe areas;
- z-index e stacking contexts ancestrais;
- estados de player, hero, fila, immersive/fullscreen e mini-player;
- ações e destinos de cada botão;
- possíveis duplicações entre footer, bottom navigation e hero.

Classifique cada achado como **bug reproduzido**, **risco técnico** ou **melhoria visual**. Não transformar uma hipótese em diagnóstico confirmado.

### 2. Topbar mobile

Objetivo visual:
- Cabeçalho compacto, com marca Ember bem proporcionada e alinhamento consistente.
- Busca acessível e fácil de alcançar; em telas estreitas, priorizar um botão/entrada de busca que abra a experiência existente em vez de comprimir todos os elementos numa única linha.
- Ações de conta e navegação contextual sem sobreposição com a marca ou com a busca.
- Fundo e bordas integrados ao tema Ember, com contraste semelhante a um app musical escuro.
- Hierarquia tipográfica clara, sem textos truncados de forma acidental.

Regras:
- Não duplicar a Topbar nem a busca.
- Não remover ações existentes de conta, login, histórico de navegação ou busca.
- Respeitar o estado `immersive`: não mostrar a Topbar quando o modo imersivo exigir ocultá-la.
- Menus e sugestões devem abrir dentro da viewport, sem serem cortados por `overflow` de ancestrais.
- Corrigir classes suspeitas ou inválidas somente após confirmar o efeito visual e funcional.
- Alvos de toque de pelo menos 44×44 CSS px; preferir 48×48.
- Considerar notch/status bar com `env(safe-area-inset-top)` quando a aplicação usar viewport edge-to-edge.

### 3. hero_reprodução / Now Playing

Objetivo visual:
- Capa como foco principal, com proporção quadrada, tamanho responsivo e margens equilibradas.
- Fundo dinâmico derivado da paleta da capa, com gradiente suave e contraste suficiente para textos e controles.
- Título e artista com hierarquia consistente, truncamento previsível e espaço para ações secundárias.
- Progresso com trilha legível, thumb perceptível e área de interação confortável.
- Controles centrais de play/pause e avançar/voltar com destaque; shuffle, repeat, fila e outras ações secundárias organizadas sem poluição.
- Layout que se adapte a telas baixas e altas, orientação retrato/paisagem e teclado/viewport móvel.

Regras:
- Reutilizar a store e os handlers reais de reprodução. Não criar segundo player nem estado paralelo.
- Preservar fontes de áudio, YouTube, fila, volume, repetição, shuffle, histórico e persistência existentes.
- Não inventar duração, progresso ou estado de reprodução.
- Verificar o comportamento da hero em `ExpandedPlayerModal`, rota `/reproducao` e modo immersive/fullscreen.
- Evitar que a capa, o título ou os controles fiquem escondidos atrás do footer ou da safe area.
- Respeitar `prefers-reduced-motion`; transições devem ser funcionais e discretas.
- Se a tela não comportar todos os controles, manter os controles essenciais visíveis e agrupar ações secundárias num menu acessível.

### 4. Footer / Player fixo

Objetivo visual:
- Barra compacta e limpa, inspirada no mini-player de apps de streaming.
- Capa pequena, título/artista com truncamento em duas linhas no máximo e controles essenciais.
- Progresso discreto integrado ao limite superior ou inferior do mini-player, sem criar uma faixa visual pesada.
- Espaçamento e alinhamento previsíveis entre capa, metadados, play/pause e ações.
- Estados de reprodução e pausa claramente distinguíveis.

Regras:
- O footer deve coexistir com a bottom navigation já existente sem sobrepor controles ou conteúdo.
- Definir explicitamente a composição e a ordem vertical entre mini-player/footer e bottom navigation. Não permitir duas barras competindo pelo mesmo espaço.
- Reservar padding inferior no conteúdo pela altura real combinada dos elementos fixos visíveis e safe area inferior.
- Quando não houver faixa selecionada, não reservar um bloco vazio nem exibir metadados fictícios.
- Preservar o botão que abre/recolhe a hero, o estado `miniPlayer`, fila e demais ações reais.
- Garantir que a hero expandida e o footer não mantenham controles duplicados ou estados contraditórios.
- Não esconder ações essenciais atrás de elementos com z-index maior.
- Considerar `env(safe-area-inset-bottom)` e a barra de gestos do sistema.

### 5. Sistema visual compartilhado

Criar ou ajustar tokens/classes compartilhados quando isso reduzir divergências:
- alturas da Topbar, mini-player/footer e bottom navigation;
- espaçamentos horizontais e verticais;
- raios, superfícies, bordas e níveis de elevação;
- tipografia para título, artista, labels e metadados;
- escala de z-index para conteúdo, Topbar, menus, player/footer, bottom nav, scrim, drawer e modal.

Não espalhar valores arbitrários em vários componentes. Evitar `!important`, margens negativas e `z-index: 9999` como correção paliativa.

### 6. Responsividade e acessibilidade

Validar ao menos:
- 320×640;
- 360×800;
- 375×812;
- 390×844;
- 414×896;
- 430×932;
- tablet e desktop para regressão.

Verificar:
- ausência de overflow horizontal;
- safe areas superior e inferior;
- telas com pouca altura;
- orientação retrato e paisagem;
- alvos de toque 44×44 CSS px no mínimo;
- foco visível, navegação por teclado e nomes acessíveis;
- `aria-label`, `aria-expanded`, `aria-pressed` e estados atuais;
- contraste e legibilidade sobre capas/gradientes;
- redução de movimento;
- menus, tooltips e popovers dentro da viewport.

### 7. Verificação

- Executar lint, TypeScript, build e testes disponíveis no projeto.
- Testar navegação entre home, busca e reprodução.
- Testar sem faixa selecionada, com faixa pausada e com reprodução ativa.
- Testar abrir/fechar hero, immersive/fullscreen, mini-player, fila, busca e menu de conta.
- Comparar screenshots antes/depois com Firecrawl nos mesmos viewports.
- Fazer regressão desktop: Topbar, Player/footer, sidebar, hero e controles.
- Registrar comandos executados, resultados, limitações e bugs remanescentes.
- Não declarar sucesso se build ou testes falharem.

## Entregáveis

1. Mapa de montagem e dependências de Topbar, hero_reprodução e footer.
2. Diagnóstico de bugs com reprodução, severidade, causa-raiz e arquivos envolvidos.
3. Plano de alterações mobile-first antes de editar.
4. Implementação focada, sem reescrever lógica de reprodução.
5. Comparação visual por viewport e teste de regressão desktop.
6. Resultado de lint, typecheck, build e testes.
7. Resumo de arquivos alterados, commits e limitações conhecidas.

## Critérios de aceite

- Topbar mobile compacta, legível e sem colisões.
- Hero de reprodução com capa, metadados, progresso e controles organizados.
- Footer/mini-player compacto, sem competir com a bottom navigation.
- Nenhum conteúdo ou controle encoberto por elementos fixos.
- Sem duplicação de player, navegação, busca ou controles.
- Playback, fila, YouTube, áudio, volume e estados existentes preservados.
- Sem overflow horizontal nos viewports testados.
- Desktop visual e funcionalmente preservado.
- Acessibilidade e safe areas verificadas.
- Testes e limitações documentados com transparência.

## Segurança de mudanças

Antes de alterar código de produção, apresentar diagnóstico e plano de correção ao usuário. Fazer mudanças em branch isolada e preservar alterações não relacionadas. Não alterar credenciais, variáveis de ambiente, provedores de áudio ou dados do usuário. Não fazer merge ou deploy sem autorização explícita.
