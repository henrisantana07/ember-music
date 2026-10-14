---
name: ember-music-m3-motion
description: Use when adding, auditing or refactoring animations and transitions (motion) in the Ember Music UI following Material Design 3. Covers motion tokens (duration/easing/distance), buttons, favorites, cards, list/row entry, navigation, menus/dialogs, mini player and expanded player, search, skeletons, toasts, audio visualizer, prefers-reduced-motion, performance and integration process. Trigger keywords/activation: @ember-motion, @m3-motion, @motion-redesign, /ember-motion, motion, animação, transição, transition, animation, easing, duração, prefers-reduced-motion, movimento reduzido, player expandido, mini player, favoritar animação, card hover, skeleton shimmer.
tools: react, typescript, css, material-design-3
---

# Skill: Ember Music — Material Design 3 Motion

Referência principal: https://m3.material.io/styles/motion

**Objetivo:** padronizar animações e transições do Ember Music, mantendo uma interface musical fluida, acessível e consistente.

## Instrução principal para agentes de código

Antes de editar o repositório, inspecione a estrutura do Ember Music, `package.json`, sistema de estilos, roteador, componentes de player e dependências. Adapte os exemplos à arquitetura real. Reutilize componentes, botões, ícones, rotas e lógica existentes. Não duplique controles, não altere a lógica de streaming ou persistência sem necessidade e não instale uma biblioteca de animação sem justificativa.

O movimento deve explicar relações, dar feedback, orientar a navegação ou comunicar uma mudança de estado. Evite animações puramente decorativas, exageradas ou que atrasem ações frequentes.

## 1. Princípios de motion

Use as diretrizes do Material Design 3 — Motion como referência e confira a documentação atual para valores normativos.

### 1.1 Movimento com propósito

- **Orientar:** mostrar de onde veio um menu, painel, diálogo ou página.
- **Relacionar:** indicar a relação entre uma capa, faixa, cartão e player expandido.
- **Confirmar:** dar feedback ao favoritar, adicionar à fila ou iniciar uma ação.
- **Dar continuidade:** tornar mudanças de conteúdo menos abruptas sem ocultar informação.
- **Priorizar:** chamar atenção para mudanças importantes sem competir com a música ou a leitura.

### 1.2 Movimento funcional e expressivo

- **Funcional:** feedback curto para botões, ícones, chips, abas, menus e listas.
- **Expressivo:** reservado para transições importantes, como expandir o player ou abrir uma área principal.
- Não deixe animações decorativas atrasarem Play/Pause, pesquisa, navegação ou troca de faixa.
- Não use movimento como única forma de comunicar um estado.

### 1.3 Continuidade espacial

- Elementos relacionados devem compartilhar direção e lógica.
- Entradas e saídas devem ser coerentes.
- Evite combinar slide, zoom e fade sem uma razão clara.
- Não anime todos os elementos da tela simultaneamente.
- Evite reexecutar animações de entrada em cada renderização React.

## 2. Tokens de motion

Os valores abaixo são uma base inicial sugerida para o Ember Music, não uma reprodução literal de todos os tokens oficiais do M3. Ajuste-os conforme a interface e teste em dispositivos reais.

| Token | Valor inicial | Uso |
|---|---|---|
| `--motion-duration-instant` | `0ms` | Sem movimento |
| `--motion-duration-short` | `100ms` | Feedback de ícone/botão |
| `--motion-duration-fast` | `160ms` | Hover e controles pequenos |
| `--motion-duration-standard` | `240ms` | Menus e superfícies pequenas |
| `--motion-duration-medium` | `320ms` | Painéis e conteúdo |
| `--motion-duration-long` | `420ms` | Transições expressivas |

### 2.1 Easing

- **standard:** para mudanças comuns de estado.
- **enter:** para elementos que entram na tela.
- **exit:** para elementos que saem.
- **linear:** somente quando movimento constante for necessário.

As curvas CSS a seguir são aproximações de projeto, não devem ser declaradas como curvas oficiais do M3 sem verificação na documentação vigente.

### 2.2 Arquivo de tokens — `src/styles/motion.css`

```css
:root {
  --motion-duration-instant: 0ms;
  --motion-duration-short: 100ms;
  --motion-duration-fast: 160ms;
  --motion-duration-standard: 240ms;
  --motion-duration-medium: 320ms;
  --motion-duration-long: 420ms;

  --motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --motion-easing-enter: cubic-bezier(0, 0, 0, 1);
  --motion-easing-exit: cubic-bezier(0.3, 0, 1, 1);

  --motion-distance-xs: 2px;
  --motion-distance-sm: 4px;
  --motion-distance-md: 8px;
  --motion-distance-lg: 16px;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-short: 0ms;
    --motion-duration-fast: 0ms;
    --motion-duration-standard: 0ms;
    --motion-duration-medium: 0ms;
    --motion-duration-long: 0ms;
  }
}
```

Importe o arquivo no ponto global de estilos existente. Se o projeto já possuir tokens, integre-os em vez de criar um sistema paralelo.

## 3. Padrões de motion para Ember Music

### 3.1 Botões e controles de reprodução

Use feedback imediato, sem deslocar o layout. O estado visual deve acompanhar o estado real do player.

```css
.motion-button {
  transition:
    transform var(--motion-duration-short) var(--motion-easing-standard),
    background-color var(--motion-duration-fast) var(--motion-easing-standard),
    opacity var(--motion-duration-fast) var(--motion-easing-standard);
}

.motion-button:active {
  transform: scale(0.97);
}

@media (hover: hover) and (pointer: fine) {
  .motion-button:hover {
    filter: brightness(1.06);
  }
}

.motion-button:focus-visible {
  outline: 2px solid var(--color-focus, currentColor);
  outline-offset: 3px;
}
```

Aplique a classe ao botão existente. Não substitua a lógica real de Play/Pause por um estado visual independente.

### 3.2 Favoritos

Anime apenas o ícone ou a superfície do botão. Conecte a ação à lógica de favoritos já existente, mantendo `aria-pressed` sincronizado com o estado real.

```tsx
type FavoriteButtonProps = {
  favorite: boolean;
  onToggle: () => void;
};

export function FavoriteButton({
  favorite,
  onToggle,
}: FavoriteButtonProps) {
  return (
    <button
      type="button"
      className={`motion-favorite ${favorite ? 'is-favorite' : ''}`}
      aria-pressed={favorite}
      aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      onClick={onToggle}
    >
      <span aria-hidden="true">{favorite ? '♥' : '♡'}</span>
    </button>
  );
}
```

```css
.motion-favorite span {
  display: inline-block;
  transition: transform var(--motion-duration-fast) var(--motion-easing-standard);
}

.motion-favorite:active span {
  transform: scale(0.88);
}

.motion-favorite.is-favorite span {
  animation: favorite-confirm var(--motion-duration-standard)
    var(--motion-easing-standard);
}

@keyframes favorite-confirm {
  0% { transform: scale(0.85); }
  55% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
```

Esse componente é ilustrativo: no repositório, prefira adaptar o botão e o ícone que já existem.

### 3.3 Cards de faixas, álbuns, artistas e playlists

Use elevação ou mudança sutil de superfície no desktop; em telas touch, ofereça feedback curto. Evite saltos de layout.

```css
.music-card {
  transform: translateY(0);
  transition:
    transform var(--motion-duration-fast) var(--motion-easing-standard),
    box-shadow var(--motion-duration-standard) var(--motion-easing-standard),
    background-color var(--motion-duration-standard) var(--motion-easing-standard);
}

@media (hover: hover) and (pointer: fine) {
  .music-card:hover { transform: translateY(-2px); }
}

.music-card:active { transform: scale(0.99); }
```

### 3.4 Entrada de linhas e listas

Use fade e deslocamento pequeno somente quando houver entrada real de conteúdo. Não anime centenas de linhas individualmente nem repita a animação em cada renderização.

```css
.track-row.is-entering {
  animation: track-enter var(--motion-duration-standard)
    var(--motion-easing-enter) both;
}

@keyframes track-enter {
  from { opacity: 0; transform: translateY(var(--motion-distance-sm)); }
  to { opacity: 1; transform: translateY(0); }
}
```

Use chaves React estáveis e preserve a posição de rolagem quando esperado.

### 3.5 Navegação e abas

Mantenha a transição entre páginas consistente. Dispare a animação pela mudança de rota, não por qualquer atualização de estado.

```css
.page-content.is-entering {
  animation: page-enter var(--motion-duration-medium)
    var(--motion-easing-enter) both;
}

@keyframes page-enter {
  from { opacity: 0; transform: translateY(var(--motion-distance-sm)); }
  to { opacity: 1; transform: translateY(0); }
}
```

Respeite o roteador e o botão voltar. Não desloque a barra de navegação persistente sem necessidade.

### 3.6 Menus, popovers e diálogos

Menus podem entrar com fade e deslocamento curto a partir do controle de origem. A lógica do componente deve gerenciar abertura, fechamento, desmontagem e foco; CSS sozinho não implementa isso.

```css
.motion-popover[data-state="open"] {
  animation: popover-enter var(--motion-duration-standard)
    var(--motion-easing-enter) both;
}

@keyframes popover-enter {
  from {
    opacity: 0;
    transform: translateY(var(--motion-distance-sm)) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

Mantenha suporte a teclado, foco visível, retorno de foco ao fechar e Escape quando aplicável.

### 3.7 Mini player e player expandido

É uma das transições prioritárias do Ember Music:

- Preserve a mesma faixa, capa, artista e estado de reprodução.
- Mantenha a reprodução contínua ao expandir ou recolher.
- Não mantenha dois players ativos durante a transição.
- Não atrase Play/Pause para concluir uma animação.
- Reutilize os controles existentes.

Exemplo conceitual com Framer Motion somente se já estiver instalado:

```tsx
import { AnimatePresence, motion } from 'framer-motion';

type PlayerSurfaceProps = {
  expanded: boolean;
  onMinimize: () => void;
};

export function PlayerSurface({
  expanded,
  onMinimize,
}: PlayerSurfaceProps) {
  return (
    <AnimatePresence mode="wait">
      {expanded ? (
        <motion.section
          key="expanded-player"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
          aria-label="Player expandido"
        >
          <button type="button" onClick={onMinimize}>Minimizar player</button>
          {/* Reutilize os dados e controles reais do player. */}
        </motion.section>
      ) : (
        <motion.section
          key="mini-player"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
          aria-label="Mini player"
        >
          {/* Reutilize os dados e controles reais do mini player. */}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
```

Este exemplo demonstra uma troca de superfícies, não uma shared-element transition completa. Para transformar visualmente a mesma capa entre os dois estados, use o recurso de layout compartilhado da biblioteca já adotada e teste para garantir que a reprodução não seja interrompida.

### 3.8 Busca, filtros e resultados

- Foque o campo de busca sem atraso artificial.
- Não anime longamente cada tecla digitada.
- Mostre loading somente quando houver uma operação real.
- Mantenha o estado visual e a acessibilidade sincronizados.

```css
.search-panel {
  transition:
    opacity var(--motion-duration-fast) var(--motion-easing-standard),
    transform var(--motion-duration-fast) var(--motion-easing-standard);
}

.search-panel[data-open="false"] {
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
}

.search-panel[data-open="true"] {
  opacity: 1;
  transform: translateY(0);
}
```

Quando fechado, o componente também deve sair da ordem de foco e da árvore acessível conforme apropriado; não confie somente em `opacity`.

### 3.9 Loading e skeletons

Prefira skeletons discretos para capas e listas. Não use spinner e skeleton ao mesmo tempo sem necessidade. O movimento deve representar carregamento real.

```css
.loading-skeleton {
  background: var(--skeleton-color, rgba(127, 127, 127, 0.16));
  border-radius: 8px;
}

@media (prefers-reduced-motion: no-preference) {
  .loading-skeleton.is-animated {
    background-image: linear-gradient(
      90deg, transparent, rgba(255, 255, 255, 0.08), transparent
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.4s linear infinite;
  }
}

@keyframes skeleton-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}
```

### 3.10 Toasts e notificações

Use fade e deslocamento curto. Não cubra controles essenciais do player. Use mensagens acessíveis (`aria-live` quando apropriado), dê tempo suficiente para leitura e não faça mensagens importantes desaparecerem rápido demais.

### 3.11 Visualizador de áudio

Sincronize a visualização com dados reais quando houver integração. Não simule reprodução quando a faixa estiver pausada. Considere bateria, desempenho móvel e suspensão de animações fora da área visível.

## 4. Acessibilidade e movimento reduzido

### 4.1 CSS de proteção

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .motion-button:active,
  .music-card:hover,
  .music-card:active {
    transform: none;
  }
}
```

Use a regra global como proteção final. Para componentes críticos, defina também comportamentos específicos para preservar feedback e clareza sem movimento.

### 4.2 Framer Motion, se disponível

```tsx
import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';

export function AppMotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
```

Use o provider apenas se a biblioteca estiver instalada e a solução for compatível com a arquitetura existente. Não adicione uma dependência apenas para transições simples que CSS resolve.

### 4.3 Regras de acessibilidade

- Nenhuma ação depende exclusivamente da animação.
- Evite flashes ou mudanças rápidas de alto contraste.
- Preserve teclado, leitores de tela, foco e rótulos acessíveis.
- Sincronize estados como `aria-pressed` e `aria-expanded`.
- Movimento reduzido deve preservar informação e feedback, usando estados estáticos quando necessário.

## 5. Desempenho

- Prefira `transform` e `opacity`. Anime `height`, `width`, margens, `top` e `left` somente quando necessário e após verificar o custo de layout.
- Evite loops simultâneos e animações contínuas desnecessárias.
- Não aplique `will-change` permanentemente a muitos elementos.
- Não anime grades inteiras ou centenas de faixas sem necessidade.
- Evite desmontar o componente responsável pela reprodução durante transições.
- Teste playlists longas, capas grandes e dispositivos móveis de baixo desempenho.

```css
.motion-panel.is-transitioning {
  will-change: transform, opacity;
}
```

Ative essa classe apenas durante a transição e remova-a quando terminar.

## 6. Organização recomendada

Adapte a estrutura ao repositório; não crie arquivos duplicados quando já existirem equivalentes.

```
src/
├── styles/
│   └── motion.css
├── components/
│   └── motion/
│       ├── MotionProvider.tsx
│       └── MotionPresence.tsx
└── ...
```

- `motion.css`: tokens, keyframes e movimento reduzido.
- `MotionProvider.tsx`: configuração compartilhada da biblioteca, se necessária.
- Componentes existentes: recebem a camada de motion sem duplicar lógica de negócio.

## 7. Processo de integração no Ember Music

1. Inspecione `package.json`, framework, roteador, estilos e componentes existentes.
2. Identifique a biblioteca de animação já adotada; se não houver, use CSS para casos simples e avalie dependências antes de instalar outra.
3. Localize player, mini player, faixas, álbuns, artistas, favoritos, busca, navegação, menus e diálogos.
4. Mapeie estados reais antes de animar.
5. Integre os tokens ao sistema visual existente.
6. Implemente primeiro botões, cards, menus, listas e player.
7. Adicione movimento reduzido e suporte a teclado.
8. Teste navegação, voltar/avançar, reprodução contínua, favoritos, listas longas, loading e erros.
9. Execute lint, testes, verificação TypeScript e build usando os scripts do projeto.
10. Revise o diff e documente arquivos alterados, testes e limitações.

### Restrições

- Não alterar API, banco de dados, streaming ou persistência apenas para adicionar motion.
- Não remover funcionalidades existentes.
- Não criar controles duplicados.
- Não inventar estados de loading ou sucesso.
- Não adicionar dependências sem motivo.
- Não comprometer mobile, teclado, leitores de tela ou movimento reduzido.

## 8. Checklist de qualidade

- Cada animação tem propósito claro.
- Durações e easing são consistentes.
- Ações frequentes continuam imediatas.
- `prefers-reduced-motion` é respeitado.
- Animações refletem o estado real da aplicação.
- O mini player e o player expandido mantêm reprodução contínua.
- Favoritos e controles reutilizam a lógica existente.
- Não há saltos de layout nem animações excessivas em listas.
- Menus e diálogos preservam foco e teclado.
- Desempenho verificado em dispositivos móveis.
- Lint, testes, TypeScript e build passam, quando disponíveis.
- A documentação registra mudanças e testes realizados.

## 9. Referências

- Material Design 3 — Motion
- Material Design 3 — Motion overview
- MDN — `prefers-reduced-motion`
- MDN — CSS animations
- MDN — CSS transitions

**Nota:** os exemplos são pontos de partida. Confirme as diretrizes atuais do M3 e a arquitetura real do Ember Music antes de aplicar valores ou instalar dependências.
