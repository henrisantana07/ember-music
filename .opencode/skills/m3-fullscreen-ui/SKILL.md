---
name: m3-fullscreen-ui
description: "Gera e refatora interfaces React com Material Design 3 (M3) ocupando 100% da tela (Full-Bleed/Edge-to-Edge), com alta visibilidade de elementos interativos e zero áreas/bordas mortas. Use quando o usuário mencionar @m3-ui, @m3-fullscreen, @m3-grid, /m3-redesign, !m3-layout, layout full-screen, edge-to-edge ou grid M3."
---

# SKILL: Material Design 3 (M3) Full-Screen & High-Visibility UI (React)

## PALAVRAS-CHAVE E COMANDOS DE ATIVAÇÃO RÁPIDA
O agente/OpenCode deve ativar automaticamente esta Skill quando o usuário incluir qualquer um dos atalhos abaixo no prompt:
- **`@m3-ui`** / **`@m3-fullscreen`**: Ativa a reestruturação M3 para ocupação de tela cheia sem bordas/telas mortas.
- **`@m3-grid`**: Aplica o sistema de grelha M3 expandida com espaçamento proporcional (`gap: 16px/24px`).
- **`/m3-redesign`**: Executa o redesign com foco em layout imersivo de tela cheia para componentes ou páginas React existentes.

---

## CONCEITOS E ARQUITETURA DE DESIGN

### 1. Full-Bleed / Edge-to-Edge Layout Redesign
Conceito de UI/UX em que a interface ocupa **100% da largura e altura visíveis (100vw x 100vh)** da viewport, eliminando margens e fundos mortos não aproveitados. Transforma aplicações web (SaaS ou plataformas de streaming de áudio/vídeo) em experiências imersivas no estilo app nativo.

### 2. M3 Spacing & Grid System (Prevenção de Colisões)
Para impedir que os elementos se misturem ao preencher a tela inteira, o sistema utiliza regras de arquitetura de espaçamento baseadas na escala de 8dp do Material Design 3:
- **Gutter & Gap Strategy:** Uso rigoroso de lacunas (`gap: 16px` ou `24px`) que isolam fisicamente cada coluna, card ou botão de ação.
- **CSS Grid (minmax / auto-fill):** Distribuição dinâmica que se expande pelas bordas sem achatar nem sobrepor informações.

### 3. Visual Chunking (Agrupamento Visual)
Técnica que emprega contêineres e cartões M3 (**M3 Elevated / Outlined Cards**, `surfaceVariant`) com elevações e bordas arredondadas (*Shape Scale*), delimitando claramente os blocos funcionais (Filtros, Listas de Músicas, Player, Detalhes) com respiro visual adequado.

---

## DIRETRICES DE DIMENSIONAMENTO E VISIBILIDADE (NO-CLIPPING RULE)

1. **Touch Targets Visíveis e Expandidos:** Todos os botões, chips e ícones clicáveis em colunas e grades DEVEM ter no mínimo **48px x 48px** (`minWidth: 48, minHeight: 48`).
2. **Estilo M3 com Alto Contraste:** Priorize botões do tipo **M3 Filled Tonal** ou **Outlined**. Evite estilos puramente transparentes ou "Ghost" que somem no fundo ou passem despercebidos.
3. **Altura de Linha Adaptativa (No Content Clipping):**
   - É estritamente proibido usar `overflow: hidden` cego que corte nomes de faixas, álbuns ou rótulos.
   - Linhas de tabelas ou listas devem possuir `minHeight: 64px` ou `72px` para acomodar confortavelmente botões de 48px e imagens de capa sem espremer o texto.
4. **M3 Filter & Assist Chips:** Os filtros de controle e barra de ferramentas devem utilizar altura expandida (`height: 40px` a `44px`) com ícones proeminentes.

---

## REQUISITO OBRIGATÓRIO DE SAÍDA: 3 OPÇÕES REFERENCIAIS DO NICHO

Em qualquer entrega de criação ou refatoração, a IA deve apresentar **NO MÍNIMO 3 OPÇÕES DE LAYOUT** baseadas nos líderes do mercado de streaming/SaaS (Spotify, YouTube Music, Deezer / Apple Music):

### Opção 1: Padrão Spotify Web (Docked Panels & CSS Subgrid)
- **Estrutura:** Layout dividido em painéis encaixados flexíveis. O painel central ocupa toda a área disponível com uma tabela fluida em `CSS Grid`.
- **Estratégia de Espaço:** As colunas ajustam-se proporcionalmente mantendo `gap: 16px`. Indicadores de status e botões de ação (Play, Favoritar, Menu) permanecem visíveis nas extremidades da linha sem encostar nos textos.

### Opção 2: Padrão YouTube Music (Full-Bleed Responsive Card Grid)
- **Estrutura:** Grade contínua de cartões de borda a borda usando `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`.
- **Estratégia de Espaço:** Cards M3 Elevated com `padding: 16px` e um botão de *Quick Play* flutuante proeminente (`FilledIconButton` M3 de 56px) posicionado sobre o card, garantindo acesso instantâneo sem poluir os títulos.

### Opção 3: Padrão Deezer / Apple Music (Tabela de Linhas Espaçadas com M3 Filter Toolbar)
- **Estrutura:** Barra superior de filtros visíveis (*M3 Filter Chips* de 44px) integrada a uma tabela com separadores visíveis e suporte nativo a Badges de mídia (HQ, Lossless, Explicit).
- **Estratégia de Espaço:** Linhas expandidas (`minHeight: 72px`) que organizam metadados em sub-linhas flexíveis quando a tela encolhe, evitando cortes ou sobreposições.

---

## CÓDIGO TEMPLATE BASE EM REACT + MATERIAL DESIGN 3 (MUI)

Abaixo está a implementação de referência combinando a estrutura de tela cheia (Edge-to-Edge) com colunas isoladas e botões visíveis de 48px:

```tsx
import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MoreVertIcon from '@mui/icons-material/MoreVert';

// Container Principal Edge-to-Edge (Ocupação total de tela sem áreas mortas)
export const M3EdgeToEdgeContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(2, 3), // 16px vertical, 24px horizontal
  gap: theme.spacing(3),
  boxSizing: 'border-box',
}));

// Barra de Filtros e Funcionalidades Superior (M3 Toolbar)
export const M3ControlToolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing(1.5),
  width: '100%',
}));

// Linha de Coluna Expandida M3 (Evita mistura e cortes de informação)
export const M3RowLayout = styled(Box)(({ theme }) => ({
  display: 'grid',
  // Colunas: [Play (48px)] [Capa (56px)] [Título/Artista (Flex)] [Álbum (Flex)] [Ações (Auto)] [Duração (80px)]
  gridTemplateColumns: '48px 56px minmax(200px, 2fr) minmax(150px, 1fr) auto 80px',
  alignItems: 'center',
  gap: theme.spacing(2), // Espaçamento de 16px garantido entre elementos
  minHeight: '72px', // Altura estendida para suportar touch targets de 48px
  padding: theme.spacing(1, 2),
  borderRadius: '16px', // M3 Shape Token
  backgroundColor: theme.palette.surfaceVariant?.main || 'rgba(255, 255, 255, 0.04)',
  transition: 'background-color 0.2s ease, transform 0.1s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
}));

// Componente Exemplo: Linha de Faixa Interativa em Tela Cheia
export function TrackRowItem() {
  return (
    <M3RowLayout>
      {/* Botão Play Visível Expandido (48px) */}
      <IconButton
        aria-label="Tocar"
        sx={{ width: 48, height: 48, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
      >
        <PlayArrowIcon />
      </IconButton>

      {/* Capa da Mídia (56px) */}
      <Box
        component="img"
        src="https://via.placeholder.com/56"
        alt="Capa do Álbum"
        sx={{ width: 56, height: 56, borderRadius: '12px' }}
      />

      {/* Título & Artista (Texto protegido contra cortes abruptos) */}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="titleMedium" fontWeight={600} noWrap>
          Título Longo da Mídia Sem Sobrepor ou Cortar
        </Typography>
        <Typography variant="bodyMedium" color="text.secondary" noWrap>
          Nome do Artista Referencial
        </Typography>
      </Box>

      {/* Nome do Álbum */}
      <Typography variant="bodyMedium" color="text.secondary" noWrap>
        Nome do Álbum do Artista
      </Typography>

      {/* Ações Secundárias Visíveis (48px) */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton aria-label="Favoritar" sx={{ width: 48, height: 48 }}>
          <FavoriteBorderIcon />
        </IconButton>
        <IconButton aria-label="Mais opções" sx={{ width: 48, height: 48 }}>
          <MoreVertIcon />
        </IconButton>
      </Box>

      {/* Duração & Indicador */}
      <Typography variant="labelLarge" textAlign="right">
        03:45
      </Typography>
    </M3RowLayout>
  );
}
```
