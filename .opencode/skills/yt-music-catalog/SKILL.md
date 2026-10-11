---
name: yt-music-catalog
description: "Especializada na curadoria, seleção e estruturação de imagens do YouTube/YouTube Music para catálogos, grades e cards, garantindo que álbuns, faixas e artistas pertençam rigorosamente ao mesmo gênero e nicho musical. Use quando o usuário mencionar @yt-catalog, @music-cards, @genre-curation ou /build-music-catalog."
activation_triggers:
  - "@yt-catalog"
  - "@music-cards"
  - "@genre-curation"
  - "/build-music-catalog"
tools:
  - react
  - typescript
  - mui
---

# SKILL: YouTube Music Genre-Specific Catalog & Card Image Curator

## 1. OBJETIVO DA SKILL
Esta skill atua na curadoria e montagem de catálogos e grades de cards em aplicações de streaming. O seu foco é garantir que as imagens coletadas da API do YouTube/YouTube Music para um determinado **gênero ou nicho musical** (ex: Lo-Fi, Rock Clássico, Electronic, Trap, MPB) mantenham coerência visual estrita, agrupando corretamente álbuns, faixas e artistas sem misturar contextos visuais discrepantes.

## 2. DIRETRIZES DE CURADORIA E FILTRAGEM POR GÊNERO
Quando o sistema processar uma listagem de dados vindas do YouTube para um nicho específico:
- **Filtragem de Contexto:** Valida metadados (título da faixa, metatags do canal do artista e nome do álbum) para garantir relevância dentro do gênero selecionado.
- **Hierarquia Visual do Catálogo:**
  - **Artistas:** Foco em fotos de perfil oficiais ou banners de alta resolução extraídos do canal do YouTube.
  - **Álbuns / Playlists:** Capas quadradas em alta definição (`maxresdefault` / `=w1200`) que reflitam a identidade visual do estilo musical.
  - **Faixas Individuais:** Thumbnails de áudio oficial ou clipes limpos, evitando thumbs com poluição visual excessiva (como textos gigantes colados por usuários).

## 3. ESTRUTURA DE DADOS DO CATÁLOGO (TYPESCRIPT)
Definição padrão para objetos de mídia curados por gênero (`src/types/catalog.ts`):

```typescript
export interface MusicCatalogItem {
  id: string;
  type: 'album' | 'track' | 'artist' | 'playlist';
  genre: string; // Ex: 'Lo-Fi', 'Rock', 'Electronic'
  title: string;
  subtitle: string; // Artista ou Descrição do Álbum
  imageUrl: string;  // Já tratada em alta resolução (=w1200 / maxresdefault)
  videoId?: string;
  metadata?: {
    releaseYear?: string;
    duration?: string;
    isExplicit?: boolean;
  };
}
```

## 4. COMPONENTE M3 DE CARD DO CATÁLOGO (REACT + MUI)

```tsx
import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { MusicCatalogItem } from '@/types/catalog';

const M3CatalogCard = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  padding: theme.spacing(2),
  borderRadius: '24px', // M3 Shape Token (Extra Large)
  backgroundColor: theme.palette.surfaceVariant?.main || 'rgba(255, 255, 255, 0.04)',
  transition: 'transform 0.2s ease, background-color 0.2s ease',
  cursor: 'pointer',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: 'translateY(-4px)',
    '& .play-btn': {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
}));

const ImageContainer = styled(Box)({
  position: 'relative',
  width: '100%',
  aspectRatio: '1 / 1',
  borderRadius: '16px',
  overflow: 'hidden',
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
});

const FloatingPlayButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  bottom: '12px',
  right: '12px',
  width: '48px',
  height: '48px',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  opacity: 0,
  transform: 'translateY(8px)',
  transition: 'opacity 0.2s ease, transform 0.2s ease',
  boxShadow: theme.shadows[4],
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

interface MusicCardProps {
  item: MusicCatalogItem;
  onPlay: (item: MusicCatalogItem) => void;
}

export function MusicCatalogCard({ item, onPlay }: MusicCardProps) {
  return (
    <M3CatalogCard onClick={() => onPlay(item)}>
      {/* Imagem do Álbum/Artista em Alta Definição mantida dentro do nicho */}
      <ImageContainer>
        <img src={item.imageUrl} alt={item.title} crossOrigin="anonymous" />
        <FloatingPlayButton
          className="play-btn"
          onClick={(e) => {
            e.stopPropagation();
            onPlay(item);
          }}
        >
          <PlayArrowIcon />
        </FloatingPlayButton>
      </ImageContainer>

      {/* Informações Textuais Organizadas por Gênero/Nicho */}
      <Box sx={{ overflow: 'hidden' }}>
        <Typography variant="titleMedium" fontWeight={600} noWrap>
          {item.title}
        </Typography>
        <Typography variant="bodyMedium" color="text.secondary" noWrap>
          {item.subtitle}
        </Typography>
      </Box>
    </M3CatalogCard>
  );
}
```

## 5. GRADE ADAPTATIVA DO CATÁLOGO (MUI STYLED)

```tsx
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const CatalogGridContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  // Grade adaptativa que preenche o espaço mantendo cards entre 220px e 280px
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: theme.spacing(3), // Respiro de 24px do M3 Grid System
  width: '100%',
  boxSizing: 'border-box',
}));
```
