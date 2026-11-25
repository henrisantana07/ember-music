---
name: ember-mobile-catalog-layout
description: Audita e corrige a apresentação responsiva de cards de músicas, playlists, álbuns e artistas nas páginas e seções mobile do Ember Music — Início, Explorar, Biblioteca, resultados de pesquisa, gêneros e filtros — com padrões de catálogo inspirados no Spotify Mobile.
---

# Ember Music — Mobile Catalog Layout

## Objetivo

Corrigir como cards, playlists, álbuns, artistas e resultados de música são exibidos no **site Ember Music em navegador mobile/PWA**, em todas as áreas relevantes:

- Início;
- Explorar / descoberta e páginas de gênero;
- Biblioteca (Favoritos, Artistas, Playlists, Recentes e Local quando aplicável);
- Resultados da pesquisa;
- Abas, filtros, estados vazios, carregamento e paginação associados a essas áreas.

A experiência deve adotar princípios de catálogo do Spotify Mobile: capas com boa escala, densidade equilibrada, hierarquia tipográfica clara, fileiras horizontais quando fizerem sentido, grades consistentes e navegação por toque. Não copiar marca, assets, ícones proprietários ou layout pixel a pixel do Spotify. Preservar a identidade visual Ember Music.

**Escopo:** versão web responsiva usada no navegador do celular. Não confundir com o app nativo Expo em `apps/mobile`; não modificar esse app a menos que o pedido inclua explicitamente o aplicativo nativo.

## Contexto confirmado do repositório

- Repositório: `henrisantana07/ember-music`.
- Stack web: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Motion e `lucide-react`.
- Página inicial: `src/app/page.tsx`.
- Biblioteca: `src/app/biblioteca/page.tsx`.
- Entrada da pesquisa/exploração: `src/app/buscar/page.tsx`, que monta `src/components/explore/ExplorePage.tsx`.
- Componentes de catálogo:
  - `src/components/TrackCard/index.tsx`;
  - `src/components/AlbumRow/index.tsx`;
  - `src/components/ArtistRow/index.tsx`;
  - `src/components/SectionRow/index.tsx`;
  - `src/components/Carousel.tsx`;
  - `src/components/explore/AlbumResultGrid.tsx`;
  - `src/components/explore/TrackResultGrid.tsx`;
  - `src/components/explore/ArtistResultCarousel.tsx`;
  - `src/components/explore/ExploreResults.tsx`;
  - `src/components/explore/ExploreFilters.tsx`;
  - `src/components/explore/ExploreTabs.tsx`;
  - `src/components/explore/GenreGrid.tsx`;
  - `src/components/playlist/PlaylistCover.tsx`.
- Grade compartilhada atual: `src/components/ui/grid.ts`, com `CATALOG_GRID = grid [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] gap-6`.
- A biblioteca usa grades próprias com mínimo de 180px para cards de artistas e playlists.
- O app raiz usa `src/components/MainContainer.tsx` e `src/app/globals.css` para scroll e estilos gerais.
- A página pública de referência para inspeção: `https://ember-music-five.vercel.app`.

Os caminhos são pontos de partida verificados na branch base; confirmar o estado atual e rastrear todos os consumidores antes de editar.

## Ferramentas obrigatórias

### GitHub
- Ler arquivos completos e pesquisar todos os usos de `CATALOG_GRID`, `Carousel`, `TrackCard`, cards de álbum, playlist e artista.
- Rastrear páginas, componentes compartilhados, estilos, dados e estados.
- Trabalhar em branch isolada e commits pequenos.
- Não substituir componentes compartilhados sem avaliar regressões em todos os consumidores.
- Não abrir PR, fazer merge ou deploy sem autorização explícita.

### Firecrawl
- Inspecionar a aplicação publicada em viewports mobile e desktop.
- Capturar screenshots comparáveis de Início, Explorar, Biblioteca, busca com resultados e páginas de gênero quando a rota/estado puder ser acessado.
- Se a página depender de login, query string ou estado client-side, documentar o que não foi possível observar.
- Scraping estático não comprova comportamento de filtros, scroll horizontal, paginação ou estados autenticados. Não afirmar que esses estados foram testados sem reproduzi-los.

## Processo obrigatório

### 1. Diagnóstico e inventário antes de editar

Leia no mínimo:
- `src/app/page.tsx`;
- `src/app/biblioteca/page.tsx`;
- `src/app/buscar/page.tsx`;
- `src/components/explore/ExplorePage.tsx`;
- `src/components/explore/ExploreResults.tsx`;
- `src/components/explore/ExploreFilters.tsx`;
- `src/components/explore/ExploreTabs.tsx`;
- `src/components/explore/GenreGrid.tsx`;
- `src/components/explore/AlbumResultGrid.tsx`;
- `src/components/explore/TrackResultGrid.tsx`;
- `src/components/explore/ArtistResultCarousel.tsx`;
- `src/components/TrackCard/index.tsx`;
- `src/components/AlbumRow/index.tsx`;
- `src/components/ArtistRow/index.tsx`;
- `src/components/SectionRow/index.tsx`;
- `src/components/Carousel.tsx`;
- `src/components/playlist/PlaylistCover.tsx`;
- `src/components/ui/grid.ts`;
- `src/app/globals.css` e `src/components/MainContainer.tsx`.

Investigue também a rota de playlist e os cards da aba Playlists na Biblioteca, além de qualquer implementação alternativa de cards encontrada por busca no repositório.

Mapeie por página:
- origem dos dados e componente que os apresenta;
- tipo de item: faixa, álbum, playlist, artista ou gênero;
- layout atual: grid, lista, carrossel ou tabela;
- largura mínima e máxima de cards, tamanho da capa, gap, padding e breakpoints;
- scroll horizontal, indicadores de navegação e comportamento por toque;
- filtros, tabs, ordenação, chips ativos e paginação;
- estados de loading, erro, vazio e resultado parcial;
- ações de play, salvar, seguir, abrir, menu e favoritos.

Classifique achados como **bug reproduzido**, **risco técnico** ou **melhoria visual**. Apresente o diagnóstico e o plano antes de editar.

### 2. Direção visual mobile-first

Aplique uma linguagem de catálogo musical inspirada no Spotify Mobile:

- cards de capa quadrada para músicas, álbuns e playlists;
- cards circulares para artistas quando esse padrão for coerente com a seção;
- títulos e metadados abaixo da capa, com truncamento consistente;
- títulos de seção e ações como “Ver tudo” alinhados e com hierarquia clara;
- fileiras horizontais para conteúdo editorial/descoberta com muitos itens;
- grids compactos para resultados que o usuário precisa comparar ou percorrer;
- superfícies discretas e estados hover apenas como melhoria desktop, nunca como requisito de interação mobile;
- uso consistente do tema Ember, com contraste, bordas e realces sem excesso de painéis.

Não impor o mesmo padrão a todos os tipos de conteúdo. Decidir entre carrossel, grid e lista com base no contexto e no volume.

### 3. Sistema de cards e grades

Auditar `CATALOG_GRID` e decidir se deve ser adaptado com classes responsivas ou substituído por uma API de layout reutilizável.

Regras:
- Em telas estreitas, evitar cards com largura mínima de 220px que resultem em apenas uma coluna, quando o conteúdo puder ser exibido em duas colunas sem comprometer legibilidade.
- Usar grid fluido com colunas adequadas à largura útil, gaps compactos e padding lateral coerente.
- Não reduzir tanto as capas que os títulos e controles se tornem difíceis de tocar ou ler.
- Garantir proporção quadrada das capas e evitar deformação.
- Usar `min-width: 0` nos itens flex/grid para evitar overflow por texto.
- Títulos devem usar truncamento intencional, tooltip apenas em desktop quando útil, e artista/metadados com contraste secundário.
- Ações de play/salvar/favoritar devem permanecer acessíveis em telas touch; não depender de `:hover`.
- Evitar que botões flutuantes cubram partes relevantes da arte ou títulos.
- Garantir alinhamento e alturas visuais consistentes entre cards da mesma fileira.
- Evitar layout shift enquanto imagens carregam; manter aspect ratio e skeletons correspondentes ao layout final.
- Reutilizar `CoverImage` e `PlaylistCover` quando adequados; preservar fallback, lazy loading e qualidade de imagem.
- Não duplicar implementações de card se um componente compartilhado responsivo puder resolver com segurança.

### 4. Carrosséis e fileiras horizontais

Para Início, fileiras de álbuns/faixas/artistas e seções de descoberta:
- Mostrar parte do próximo card quando isso comunicar que a fileira é rolável.
- Usar dimensões mobile coerentes por tipo de card, sem largura desktop fixa excessiva.
- Garantir scroll horizontal suave por gesto, sem capturar o scroll vertical da página.
- Ocultar scrollbar visualmente sem remover a affordance de rolagem.
- No mobile, setas que só aparecem em hover não podem ser o único meio de navegação.
- Evitar botões de navegação sobre a capa e não criar controles inacessíveis por toque.
- Verificar `scroll-snap` somente se melhorar a navegação e não prejudicar o gesto.
- Preservar comportamento desktop com setas/hover quando já existente.
- Não aninhar carrosséis horizontalmente sem necessidade.

### 5. Biblioteca

Revisar todas as abas:
- Favoritos;
- Artistas;
- Playlists;
- Recentes;
- Local, se estiver habilitada para a versão web.

Garantir:
- Tabs horizontais roláveis em telas estreitas, com estado ativo evidente e sem quebra de layout.
- Busca, ordenação e ações primárias com boa organização mobile.
- Grades de playlists e artistas com dimensões coerentes e toque confortável.
- Capas de playlist usando a resolução responsiva; evitar tamanho fixo em pixels que impeça o card de encolher.
- Estados vazios, loading e erro com largura e espaçamento mobile adequados.
- Listas de faixas/tabelas devem ter uma apresentação mobile legível, sem exigir scroll horizontal de página inteira.
- Filtros e ordenação devem continuar funcionais, sem perder estado ao alternar abas.
- Não modificar regras de acesso, autenticação, Supabase, favoritos, playlists ou histórico.

### 6. Explorar, gêneros e filtros

Revisar:
- grade de gêneros;
- fileiras de artistas;
- grade de álbuns;
- grade/lista de faixas;
- tabs de tipo de resultado;
- filtros de gênero, artista e duração;
- chips de filtros ativos e ação de limpar.

Garantir:
- Filtros não devem estourar a largura da tela nem encolher para controles ilegíveis.
- Em mobile, agrupar ou permitir rolagem horizontal dos filtros sem esconder a existência de filtros ativos.
- Tabs e contagens devem ser legíveis e roláveis quando necessário.
- Chips ativos devem quebrar linha ou rolar com comportamento claro, sem criar overflow horizontal acidental.
- Resultados devem usar uma grade responsiva apropriada por tipo; artistas podem permanecer em fileira horizontal.
- O estado de filtro deve continuar refletido na URL e sobreviver a refresh/back/forward conforme o comportamento atual.
- Preservar lógica de filtragem, contagens, paginação e tratamento de ausência de resultados.

### 7. Início e resultados de pesquisa

Início:
- Revisar todas as seções personalizadas e não personalizadas, incluindo Em alta, Gêneros, artistas, faixas e álbuns.
- Garantir consistência entre as fileiras e hierarquia entre título da seção, cards e ação de navegação.
- Não alterar algoritmos de recomendação, histórico ou ordenação dos dados.

Pesquisa:
- Garantir que o layout de faixas, artistas e álbuns se adapte independentemente.
- Rever o estado “Tudo” e as abas específicas.
- Garantir que cards e listas não causem uma coluna única excessivamente larga nem uma grade comprimida.
- Preservar query, filtros, paginação e navegação de resultados.

### 8. Responsividade e acessibilidade

Testar pelo menos:
- 320×640;
- 360×800;
- 375×812;
- 390×844;
- 414×896;
- 430×932;
- tablet e desktop para regressão.

Verificar:
- zero overflow horizontal na página;
- scroll horizontal apenas nos carrosséis/abas/filtros intencionais;
- alvos de toque de pelo menos 44×44 CSS px;
- foco visível e navegação por teclado;
- nomes acessíveis para ações de ícone;
- contraste entre título, metadados, bordas e fundos;
- `prefers-reduced-motion`;
- imagens com `alt` adequado ou vazio quando decorativas;
- carregamento lazy e dimensões reservadas;
- safe areas e convivência com o mini-player/footer e bottom navigation já existentes.

### 9. Validação

- Executar lint, TypeScript, build e testes disponíveis.
- Validar cada página e aba com conjuntos de dados pequenos e grandes.
- Testar filtros combinados, limpar filtros, alternar tabs e voltar no histórico.
- Testar cards com títulos curtos/longos, artista ausente, capas ausentes e imagens lentas.
- Testar ações de toque: abrir álbum/playlist/artista, tocar faixa, salvar álbum, favoritar e seguir.
- Comparar screenshots Firecrawl antes/depois nos mesmos viewports.
- Fazer regressão desktop e verificar que a grade desktop não foi degradada.
- Registrar comandos, resultados e limitações; não declarar sucesso se build/testes falharem.

## Entregáveis

1. Matriz página/seção → componentes responsáveis.
2. Diagnóstico dos problemas de layout e das causas-raiz.
3. Plano de correção mobile-first antes de editar.
4. Implementação dos cards, grades, carrosséis, tabs e filtros responsivos.
5. Comparação visual por página e viewport.
6. Resultado de lint, typecheck, build e testes.
7. Lista dos arquivos alterados, commits e limitações remanescentes.

## Critérios de aceite

- Cards de músicas, playlists, álbuns e artistas têm apresentação adequada em telas mobile.
- Início, Explorar, Biblioteca e resultados da pesquisa têm layouts consistentes.
- Filtros, tabs e chips não provocam overflow acidental.
- Grades mostram número de colunas adequado à largura disponível.
- Carrosséis são utilizáveis por gesto, sem depender de hover ou setas.
- Capas não deformam, não pulam de tamanho ao carregar e mantêm boa qualidade.
- Textos e metadados permanecem legíveis e truncados de forma intencional.
- Ações continuam acessíveis e funcionais por toque.
- Lógica de dados, busca, filtros, playlists, favoritos e reprodução permanece preservada.
- Desktop continua funcional e visualmente consistente.
- Build e verificações automatizadas passam, ou falhas são explicitamente documentadas.

## Segurança de mudanças

Antes de alterar componentes compartilhados, apresentar diagnóstico e plano de correção. Implementar em branch isolada, preservar alterações não relacionadas e verificar todos os consumidores do componente modificado. Não alterar credenciais, variáveis de ambiente, dados do usuário, regras de acesso ou lógica de negócio fora do escopo. Não fazer merge ou deploy sem autorização explícita.
