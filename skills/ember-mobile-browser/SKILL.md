---
name: ember-mobile-browser
description: Audita e converte a experiência mobile do Ember Music no navegador, inspirada nos padrões de usabilidade do Spotify Mobile. Mapeia e corrige conflitos de ícones, HUD, player, bottom navigation, drawers, overlays, z-index e safe areas, preservando o desktop.
---

# Ember Music — Mobile Browser Experience

## Objetivo
Transformar o Ember Music em uma experiência mobile-first para navegador, com navegação musical intuitiva inspirada nos padrões do Spotify Mobile (sem copiar marca, assets ou interface pixel a pixel). Preservar integralmente a experiência desktop e os comportamentos reais de reprodução, biblioteca, busca e autenticação.

## Contexto confirmado
- Repositório: `henrisantana07/ember-music`; branch-base observada: `master`.
- Stack raiz: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Motion e `lucide-react`.
- O root `package.json` declara workspace `apps/mobile`: inspecione-o antes de escolher o ponto de entrada. O pedido é para navegador mobile, não app nativo.
- Site publicado observado: `https://ember-music-five.vercel.app`.
- `src/components/Sidebar/index.tsx` já contém sidebar desktop, bottom navigation mobile e drawer de biblioteca. `src/components/Sidebar/Sidebar.tsx` apenas reexporta o componente de `./index`: não crie uma segunda Sidebar.
- A navegação mobile atual usa `NAV_SECTION1`, uma barra fixa `h-16` com `z-50`; drawer usa scrim `z-40` e painel `z-50`. A barra e o drawer precisam ser auditados em conjunto.
- `src/components/Sidebar/types.ts` define tipos auxiliares, mas não substitui a inspeção da UI real.
- Use a dependência existente `lucide-react`; não instale outra biblioteca de ícones sem necessidade comprovada.

## Ferramentas obrigatórias

### GitHub
1. Confirme repositório, branch padrão e estado atual.
2. Localize layouts, CSS global, sidebar, topbar, player, mini-player, HUD, modais, drawers, overlays, botões e ícones.
3. Leia os arquivos completos antes de editar e rastreie todos os pontos de montagem.
4. Trabalhe em branch isolada. Preserve mudanças não relacionadas.
5. Faça commits descritivos e abra PR apenas quando autorizado.

Pesquise: `Sidebar`, `NAV_SECTION1`, `bottom-0`, `fixed`, `sticky`, `z-`, `zIndex`, `Player`, `MiniPlayer`, `HUD`, `NowPlaying`, `Playback`, `safe-area`, `pointer-events`, além dos layouts e tokens globais. Se a busca de código não estiver indexada, navegue pelos arquivos/árvore do repositório; zero resultados não significa que o componente inexiste.

### Firecrawl
- Inspecione `https://ember-music-five.vercel.app` em viewport desktop e mobile.
- Capture screenshots full-page e estados de home, busca, biblioteca, playlist/álbum, mini-player, player expandido e drawer quando acessíveis.
- Compare site publicado e código da branch.
- Consulte documentação oficial atual quando houver dúvida específica de CSS, viewport, safe areas, acessibilidade ou comportamento de navegador.
- Registre rota, viewport e estado da UI. Scraping estático não prova interação: não declare corrigido o que não foi reproduzido/verificado.

## Processo obrigatório

### 1. Diagnóstico
- Leia `package.json`, estrutura `app/` ou `src/app/`, `apps/mobile/`, layouts, CSS global e componentes de navegação/player.
- Identifique qual aplicação é servida pela URL publicada e o ponto de entrada correto.
- Inventarie topbar, sidebar, bottom nav, mini-player, player expandido, drawer, scrim, modal, toast, menus e controles.
- Para cada elemento, registre arquivo, breakpoint, posição, altura, z-index, stacking context ancestral, área ocupada, scroll e safe areas.
- Reproduza em 320, 360, 375, 390, 414 e 430 CSS px, tablet e desktop.
- Separe bug confirmado, risco potencial e preferência visual. Documente antes de editar.

### 2. Layout mobile
- Conteúdo fluido, `min-width: 0` em filhos flex/grid e sem overflow horizontal global.
- Topbar compacta e contextual; não disputar espaço com player/nav.
- Uma única bottom navigation visível em mobile, com destinos essenciais, estado ativo e alvos de toque de pelo menos 44×44 CSS px (preferir 48×48).
- Reutilize o drawer/biblioteca existentes; não crie navegação paralela. O painel deve ficar acima do scrim e da bottom nav; fechar ao navegar e com Escape; bloquear/restaurar scroll do fundo.
- Mini-player persistente apenas quando houver contexto real de reprodução; nunca simular playback.
- Player expandido respeita área disponível, safe areas e controles táteis.
- Reservar padding inferior dinâmico para a soma real dos elementos fixos visíveis; evitar conteúdo encoberto e espaço vazio quando player estiver oculto.
- Considerar `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`; verificar `viewport-fit=cover`.
- Isolar mudanças por breakpoints/classes responsivas; preservar sidebar e hierarquia desktop.

### 3. Auditoria de ícones, HUD e camadas
Investigue causa-raiz de cada colisão:
1. Bounding boxes de ícones, labels, badges, botões e controles.
2. Ordem de camadas e z-index; criar escala documentada para conteúdo, menus, bottom nav, mini-player, scrim, drawer, modal e toast.
3. Stacking contexts criados por `transform`, `filter`, `opacity`, `isolation`, `contain`, `position`/z-index e propriedades equivalentes. Z-index alto dentro de contexto inferior não ultrapassa outro contexto.
4. Elementos fixos que disputam a mesma região; uma fonte de verdade para alturas e offsets.
5. `pointer-events`: decoração/overlay não pode bloquear controles; não desativar eventos em elementos interativos.
6. SVG duplicado, ícone em wrapper e pseudo-elemento repetidos, paths incompatíveis, `viewBox`, dimensões, alinhamento, stroke/fill e `flex-shrink`.
7. Botões/HUD: uma ação por controle, nome acessível, estado claro; nunca aninhar botão/link interativo.
8. Drawer/scrim: scrim acima do conteúdo e abaixo do painel; bottom nav não pode aparecer sobre o scrim.
9. Player/nav: definir estados minimizado/expandido e comportamento quando drawer/modal abre.
10. Safe areas, foco visível, `aria-label`, `aria-current`, `aria-expanded`, teclado e contraste.

Não use `z-index: 9999` como paliativo, margens negativas, offsets arbitrários, ocultação de controles essenciais ou remoção de funcionalidades.

### 4. Direção visual
- Padrões de interação de produto musical mobile: bottom nav compacta; mini-player com capa/título/artista e controles essenciais; player expandido com hierarquia de capa, metadados, progresso e controles; listas compactas; carrosséis táteis; truncamento consistente.
- Manter identidade, cores, tokens e branding Ember. Spotify é referência de usabilidade, não de cópia.
- Não depender de hover; animações curtas e funcionais; respeitar `prefers-reduced-motion`.

### 5. Arquitetura e preservação
- Reutilize componentes, stores e providers. Não crie segundo player, sidebar ou navegação.
- Não misture provedores nem simule reprodução. Preserve `MusicProvider`/`ProviderManager` e adaptadores específicos se existirem.
- Não altere Supabase, autenticação, YouTube API, fila, favoritos ou biblioteca como efeito colateral visual.
- Não remova rotas/destinos sem evidência e aprovação explícita.
- Centralize dimensões compartilhadas em tokens/CSS variables.
- Evite `!important` e dependências novas sem justificativa.
- Preserve SSR/hidratação Next.js; não acesse `window`/localStorage no render inicial sem padrão SSR-safe.

### 6. Verificação
- Rode lint, TypeScript/build e testes existentes.
- Teste home, busca, biblioteca, artista, álbum/playlist e estados de reprodução.
- Teste larguras 320, 360, 375, 390, 414, 430, tablet e desktop.
- Verifique scroll topo/meio/fim, mini-player, drawer, player expandido, rotação e safe areas quando possível.
- Confirme ausência de overflow horizontal, conteúdo encoberto, ícones duplicados, controles sem clique e foco inacessível.
- Compare screenshots antes/depois com Firecrawl. Declare limitações de testes não executados.
- Não declare sucesso se build/testes falharem; reporte erro e arquivo/linha.

## Entregáveis
1. Mapa de componentes: caminho, papel, breakpoint e dependências.
2. Mapa de camadas: posição, z-index/stacking context, conflito e correção.
3. Matriz de bugs: severidade, reprodução, causa-raiz, arquivos e status.
4. Implementação focada, com justificativa e preservação desktop.
5. Verificação: comandos, resultados, viewports e rotas testadas.
6. Resumo do que mudou, foi mantido e requer teste manual.
7. Branch/commits e PR, se autorizado.

## Critérios de aceite
- Navegação mobile intuitiva e consistente com padrões de produto musical.
- Sem bottom nav, mini-player ou HUD duplicados/concorrentes.
- Drawer, scrim, player e bottom nav com camadas/offsets determinísticos.
- Ícones sem colisões com labels, badges, controles ou áreas de toque.
- Conteúdo nunca encoberto por elementos fixos.
- Sem overflow horizontal não intencional nos viewports testados.
- Desktop preservado.
- Reprodução, biblioteca, busca, autenticação e dados reais continuam usando a lógica existente.
- Lint/build/testes passam ou falhas remanescentes são documentadas.

## Segurança de mudanças
Antes de editar código da aplicação, apresente diagnóstico e plano. Faça alterações em branch isolada. Não sobrescreva trabalho não relacionado, não altere secrets/variáveis de ambiente e não faça deploy/merge sem solicitação explícita.
