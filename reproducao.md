# Prompt Dedicado — Tela de Visualização Expandida do Player (Antigravity)

Use este prompt como complemento ao prompt principal do projeto. Cole no Antigravity quando for implementar especificamente a tela expandida do player (estilo YouTube Music / Spotify full-screen).

---

## CONTEXTO E REFERÊNCIA

Implementar uma tela de visualização expandida do player, ativada como **modal/overlay por cima do layout existente** (sidebar permanece visível e funcional). A referência estrutural é o YouTube Music (player principal à esquerda + fila à direita), mas adaptada à identidade visual do projeto: paleta preto/laranja/amarelo com ambient color dinâmico extraído da capa do álbum.

A sidebar e o player fixo inferior continuam montados no DOM — o modal se sobrepõe ao conteúdo central sem destruir o layout.

---

## GATILHO DE ABERTURA / FECHAMENTO

O modal abre por **dois gatilhos simultâneos** — ambos devem funcionar:
1. Clique na **capa da música** no player fixo inferior
2. Clique no **botão de expansão** (ícone de seta para cima ou chevron-up) fixo no player inferior, à direita dos controles

Fechamento:
- Botão "✕" ou seta para baixo (chevron-down) no canto superior do modal
- Tecla `Escape`
- **Não fechar** ao clicar fora (para evitar fechamento acidental enquanto o usuário interage com a fila)

Transição de abertura/fechamento: slide-up suave vindo de baixo (origin no player inferior), duração 280-320ms com easing `cubic-bezier(0.32, 0.72, 0, 1)` — igual ao padrão do Spotify. Nunca usar fade simples, que parece genérico.

---

## LAYOUT DO MODAL

### Estrutura geral (duas colunas)

```
┌─────────────────────────────────────────────────────────────┐
│  [✕ fechar]                              [aba: A Seguir]    │
│                                                             │
│   ┌─────────────────────────┐   ┌─────────────────────────┐ │
│   │                         │   │  FILA DE REPRODUÇÃO     │ │
│   │   CAPA DO ÁLBUM         │   │  ─────────────────────  │ │
│   │   (ampliada, quadrada)  │   │  ▶ faixa atual          │ │
│   │                         │   │  ─────────────────────  │ │
│   └─────────────────────────┘   │  próxima faixa 1        │ │
│                                 │  próxima faixa 2        │ │
│   Nome da faixa (grande)        │  próxima faixa 3        │ │
│   Nome do artista               │  ...                    │ │
│                                 │                         │ │
│   [♡ favoritar]  [⬇ download]  └─────────────────────────┘ │
│                                                             │
│   ████████████░░░░░░  2:14 / 4:32  (barra de progresso)   │
│                                                             │
│   [⏮]  [⏪]  [⏯ PLAY]  [⏩]  [⏭]   🔊──────  [↺] [⇄]  │
└─────────────────────────────────────────────────────────────┘
```

- **Coluna esquerda (60% da largura):** capa ampliada + informações da faixa + controles
- **Coluna direita (40% da largura):** fila de reprodução com scroll independente
- Em mobile: layout em coluna única, fila de reprodução colapsável (aba inferior ou drawer)

---

## AMBIENT COLOR DINÂMICO (DETALHE TÉCNICO CRÍTICO)

Este é o efeito que diferencia o visual de produto genérico para produto premium. Implementar assim:

### Extração de cor
- Usar a biblioteca **`colorthief`** (leve, sem dependências) para extrair a cor dominante da capa do álbum atual
- Extrair no momento em que a faixa muda (ou quando o modal abre pela primeira vez)
- Usar a cor dominante retornada pelo `colorthief` como base

### Aplicação no fundo
- **Não** usar a cor pura — ela pode ser muito saturada/clara e comprometer a legibilidade
- Aplicar assim:
  ```css
  background: radial-gradient(
    ellipse at 30% 20%,
    {cor_dominante_com_40%_opacidade} 0%,
    #0A0908 60%
  );
  ```
- O gradiente parte do canto superior esquerdo (onde a capa está) e dissolve para o `--bg-base` do projeto (`#0A0908`)
- Por cima do gradiente, aplicar um layer de `backdrop-filter: blur(80px)` em um pseudo-elemento com a cor, para criar o efeito "glowing" difuso sem a cor parecer chapada

### Transição entre faixas
- Quando a faixa mudar, fazer crossfade da cor antiga para a nova com transição CSS de 800ms — nunca trocar abruptamente

### Fallback
- Se a extração de cor falhar (imagem com CORS bloqueado, erro de rede), usar o gradiente padrão do projeto: `linear-gradient(135deg, #FF6A0015, #0A0908)`

---

## CAPA DO ÁLBUM (COLUNA ESQUERDA)

- Exibir em formato quadrado, com `border-radius` de 12-16px
- Tamanho máximo: 380x380px (desktop), responsivo abaixo disso
- Sombra: `box-shadow: 0 32px 64px {cor_dominante_com_30%_opacidade}` — a sombra também usa a cor extraída, criando o efeito de "luz projetada" da capa no fundo
- Animação sutil ao trocar de faixa: leve scale de 0.96 → 1.0 com fade, duração 300ms
- Não usar bordas ou frames ao redor da capa — deixar a sombra criar a separação do fundo

### Informações abaixo da capa
- **Nome da faixa:** `font-size: 28-32px`, peso 700, cor `--text-primary (#F5F1ED)`, truncar com `...` se muito longo
- **Nome do artista:** `font-size: 16px`, peso 400, cor `--text-secondary (#A39B92)`, clicável (leva à página do artista)
- **Botões de ação** (linha horizontal, abaixo do artista):
  - ♡ Favoritar — ícone de coração: vazio (não favoritado) / preenchido com gradiente laranja→amarelo (favoritado). Estado reflete e sincroniza com o estado global de favoritos
  - ⬇ Download — ícone de seta para baixo, inicia o download real do arquivo de áudio via Jamendo. Mostrar toast de confirmação

### Barra de progresso
- Largura total da coluna esquerda, abaixo dos botões de ação
- Altura em repouso: 4px; altura no hover: 6px (transição suave)
- Preenchimento: gradiente `linear-gradient(90deg, #FF6A00, #FFC400)`
- Thumb (bolinha de posição): visível apenas no hover, cor `#FFC400`, tamanho 14px
- Tempo decorrido à esquerda e duração total à direita, em `--text-secondary`
- Clicável e arrastável para seek (mudar posição da música)

### Controles de playback
- Linha de ícones centralizada abaixo da barra de progresso
- Ordem: [⏮ anterior] [velocidade/shuffle] [⏯ play/pause] [repetir] [⏭ próxima]
- Botão play/pause: maior que os outros (48px vs 32px), com fundo em gradiente laranja→amarelo e ícone em `--bg-base` (preto) — contraste forte
- Controle de volume: slider horizontal à direita dos controles principais, com a mesma estética da barra de progresso (gradiente no preenchimento)
- Ícones: usar **Lucide React** (já no stack) para consistência — nunca misturar famílias de ícones

---

## FILA DE REPRODUÇÃO (COLUNA DIREITA)

### Header
- Título "A seguir" em `--text-primary`, peso 600
- Subtítulo discreto: nome da playlist/álbum de origem, em `--text-secondary`

### Faixa atual (topo da fila)
- Destacada com fundo sutil: `--accent-muted (#C9620022)` + borda esquerda fina (3px) em gradiente laranja→amarelo
- Ícone de ondas animadas (audio waveform) à esquerda indicando "tocando agora"
- Não duplicar a faixa atual na lista de "próximas" abaixo

### Próximas faixas (lista scrollável)
- Cada item: miniatura da capa (40x40px, border-radius 4px) + nome da faixa + artista + duração à direita
- Hover: fundo `--bg-elevated`, revelar botão de play no lugar da miniatura
- Clique: pula direto para aquela faixa
- Drag-and-drop para reordenar a fila (usar `@dnd-kit/core` ou `react-beautiful-dnd`)
- Scroll independente da coluna esquerda (a capa não rola junto)

### Rodapé da fila
- Botão "Adicionar à fila" (abre busca inline para adicionar faixas)
- Botão "Limpar fila" (com confirmação via toast, não modal de confirmação — muito pesado para essa ação)

---

## RESPONSIVIDADE (MOBILE)

- Modal ocupa 100% da tela (altura e largura)
- Layout em coluna única: capa menor (200x200px), controles centralizados, fila de reprodução acessível por aba/tab abaixo dos controles (não visível por padrão — clicar em "A seguir" para revelar como drawer da parte inferior)
- Swipe para baixo fecha o modal (gesture handler)

---

## ESTADOS E EDGE CASES

- **Fila vazia** (faixa avulsa sem contexto de playlist): coluna direita mostra "Nenhuma faixa na fila" + sugestão de faixas relacionadas via API do Jamendo (`/tracks/similar`)
- **Capa indisponível:** usar placeholder com ícone de nota musical centralizado, fundo `--bg-surface`, sem quebrar o layout
- **Faixa muito longa (nome):** truncar com `text-overflow: ellipsis`, mostrar nome completo em tooltip no hover
- **Erro ao extrair cor da capa:** usar fallback de gradiente do projeto silenciosamente, sem mensagem de erro para o usuário (é detalhe cosmético, não funcional)

---

## PERGUNTAS QUE VOCÊ DEVE ME FAZER ANTES DE IMPLEMENTAR

- Se houver conflito de CORS ao carregar a imagem da capa do Jamendo para extração de cor via `colorthief` (Canvas API exige mesma origem ou CORS permitido), me avise antes — pode ser necessário proxy via API route do Next.js
- Se `@dnd-kit` ou `react-beautiful-dnd` tiver conflito com a versão do React/Next.js do projeto, sugira alternativa antes de implementar
- Qualquer limitação da API do Jamendo para buscar faixas similares (`/tracks/similar`) que impeça a sugestão no estado de fila vazia