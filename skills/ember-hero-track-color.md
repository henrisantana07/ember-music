---
name: ember-hero-track-color
description: "Cria e integra fundos dinâmicos para o hero de reprodução do Ember Music a partir da capa da faixa, com extração de paleta, scoring perceptual inspirado no Spotify, gradiente escuro, contraste acessível e otimização React/TypeScript."
activation_triggers:
  - "hero de reprodução"
  - "cor de fundo por faixa"
  - "Spotify color extraction"
  - "album cover palette"
  - "dynamic player background"
  - "Ember Music player UI"
tools:
  - "GitHub"
  - "TypeScript"
  - "React"
---

# Ember Music — Hero Track Color

## Objetivo

Definir automaticamente uma cor de fundo para o hero de reprodução com base na capa da faixa atual. A experiência deve lembrar a linguagem visual do Spotify: cor derivada da arte, atmosfera escura, transição suave e controles/textos legíveis, sem copiar ou afirmar reproduzir o algoritmo interno proprietário do Spotify.

## Regras de integração obrigatórias

1. **Audite antes de alterar.** Inspecione o player global, a origem das capas, o estado da faixa atual, os tokens de tema e os padrões de carregamento/erro existentes.
2. No Ember Music, preserve a arquitetura atual React + TypeScript e reutilize o player, stores e componentes existentes. Não crie um segundo player, store paralelo, nem controles duplicados.
3. Integre a cor somente ao hero/área de reprodução pertinente; não altere todas as páginas ou superfícies globais sem necessidade.
4. Priorize a URL da capa em maior resolução já disponível. Respeite as regras de CORS; defina `crossOrigin = "anonymous"` **antes** de atribuir `src`. Se o Canvas for bloqueado, use o proxy de imagem já existente no projeto (historicamente `/api/image-proxy?src=...`) somente após confirmar que ainda existe e que é seguro. Não invente endpoints.
5. Nunca deixe a troca de faixa exibir por muito tempo a cor da faixa anterior. Associe o resultado à URL/ID da faixa atual, limpe ou use fallback ao mudar a capa e ignore resultados assíncronos obsoletos.
6. Mantenha o tema e os tokens de design existentes. Não introduza dependências novas sem justificar a necessidade.
7. Respeite `prefers-reduced-motion`, responsividade e os alvos de toque já definidos. Transições típicas de 250–400 ms, sem animação contínua.
8. Não afirme que a fórmula abaixo é o algoritmo oficial do Spotify. É uma aproximação inspirada em técnicas de seleção de cor e na fórmula fornecida pelo solicitante.

## Pipeline recomendado

1. **Obter a capa:** usar a URL já associada à faixa atualmente tocando.
2. **Carregar com segurança:** usar imagem assíncrona, tratamento de erro, cancelamento/limpeza e CORS.
3. **Reduzir a amostra:** desenhar em canvas de até 100 × 100 mantendo a proporção. Isso limita o processamento a aproximadamente 10 mil pixels.
4. **Ler pixels:** usar `ImageData` e `Float32Array`; ignorar pixels totalmente transparentes e, se fizer sentido para as capas reais, amostras quase transparentes.
5. **Agrupar cores:** executar K-means determinístico ou com inicialização controlada, (k = 8), cerca de 8–10 iterações. Usar Typed Arrays onde simplificarem a memória e o desempenho. Garantir que clusters vazios não causem NaN e que contagens sejam mantidas fora do escopo do loop.
6. **Pontuar os clusters:** normalizar RGB para [0, 1], calcular chroma, darkness e dominance e selecionar o maior score.
7. **Pós-processar:** limitar extremos puros, ajustar saturação/luminosidade moderadamente e verificar contraste real com o texto e os controles.
8. **Criar o gradiente:** cor dominante no topo, transição para a cor de superfície escura do tema existente (fallback padrão `#121212` apenas se compatível com o tema).
9. **Aplicar suavemente:** atualizar CSS variables ou o mecanismo de estilo já usado pelo hero, com fallback imediato e sem piscar.
10. **Validar:** capas claras, escuras, monocromáticas, muito saturadas, URL inválida, CORS, troca rápida de faixas, navegação por teclado e viewport móvel.

## Scoring de cor

Constantes sugeridas a partir da fórmula fornecida:

- `QC = 4.9226`
- `QD = 1.406`
- `QR = 0.7932`

Para cada centroide RGB normalizado:

```ts
const chroma = Math.sqrt(
  (r - g) ** 2 + (((r + g) / 2) - b) ** 2
);

const luminance = Math.sqrt(
  0.299 * r * r + 0.587 * g * g + 0.114 * b * b
);

const darkness = 1 - luminance;
const score = QC * chroma + QD * darkness + QR * dominance;
```

`dominance` é a quantidade de pixels atribuídos ao cluster dividida pelo total de pixels amostrados. Como esta fórmula é uma heurística, compare visualmente os resultados em uma coleção representativa de capas. Não trate os pesos como verdade universal ou garantia de correspondência com o Spotify.

### Limitações da fórmula

- O cálculo de luminância acima é a fórmula específica do método fornecido, não a luminância relativa WCAG. Não o use para avaliar acessibilidade.
- O scoring tende a favorecer cores escuras e coloridas; imagens em preto e branco, capas com margens grandes ou artes com vários focos podem exigir fallback ou ajuste.
- Substituir preto/branco puros apenas por um cinza arbitrário pode destruir a identidade cromática. Prefira ajustar luminosidade mantendo o matiz quando possível.
- Aumentar saturação em 1,1× não garante contraste. O contraste deve ser calculado separadamente ou protegido por overlays/superfícies adequadas.

## Arquitetura TypeScript sugerida

Adapte os nomes aos padrões existentes; não crie arquivos cegamente antes de verificar a estrutura.

- `src/lib/color/extract-track-color.ts`: funções puras de amostragem, clustering, scoring, conversões e resultado.
- `src/hooks/use-track-hero-color.ts`: integração React com ciclo de vida, erro, troca de faixa e cancelamento lógico.
- Hero do player existente: consumir o resultado e aplicar o gradiente via classe/CSS variables.

Interface sugerida:

```ts
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface TrackHeroColor {
  primary: string;
  light: string;
  gradient: string;
  hsl: { h: number; s: number; l: number };
}
```

Mantenha o extrator como função pura quando possível. Mantenha efeitos de carregamento de imagem dentro do hook, não em renderizações repetidas.

### Hook React — requisitos

- Estado explícito de resultado e, se útil, de erro/carregamento.
- Ao receber URL vazia: limpar resultado anterior e usar fallback.
- Criar imagem e definir `crossOrigin` antes de `src`.
- Validar `naturalWidth` e `naturalHeight`; verificar se `canvas.getContext("2d")` existe.
- Capturar erros de `drawImage`/`getImageData` (incluindo canvas contaminado por CORS).
- No cleanup, remover handlers e impedir que uma resposta de imagem antiga atualize o estado.
- Evitar reprocessar a mesma URL; cache em memória opcional com limite de tamanho. Não usar armazenamento persistente para cores sem necessidade.
- Não usar `useRef` para uma imagem se a referência não tiver função real.

## Performance: escolha proporcional

**Padrão recomendado:** downsampling para 100 × 100 + Typed Arrays + K-means pequeno e determinístico. Para uma capa estática, essa abordagem tende a ser suficiente; medir antes de otimizar.

Não implemente Mini-Batch K-means com lote de 32 como padrão: uma amostra tão pequena pode perder cores importantes em apenas 10 mil pixels e a complexidade adicional não é necessária. Também não implemente Elkan, WebGL2 ou WASM antes de profiling demonstrar gargalo real. GPU/WASM são opções para processamento em lote ou mídia em tempo real, não para uma única capa no hero.

- Evite arrays de objetos por pixel.
- Não aloque arrays temporários dentro do loop interno.
- Use semente determinística ou inicialização reprodutível para evitar mudanças de cor entre renders da mesma capa.
- Defina um orçamento de performance realista e meça em dispositivos modestos; não prometa `<5 ms` ou `<50 ms` sem benchmark no projeto.
- Cacheie o resultado por URL da capa para evitar recalcular ao voltar para uma faixa.

## Gradiente e contraste

- Use a cor extraída como atmosfera, não como plano de fundo sólido atrás de todos os elementos.
- Gradiente inicial sugerido: `linear-gradient(180deg, var(--track-color) 0%, var(--player-surface) 100%)`.
- Prefira uma variável do tema para `--player-surface`; use `#121212` somente como fallback de tema escuro.
- Verifique o contraste de títulos, metadados, botões e estados de foco sobre o ponto mais claro do fundo. Texto branco não é automaticamente acessível em toda cor extraída.
- Se necessário, use overlay escuro sutil atrás de texto/controles, sem neutralizar completamente a capa.
- Cor `light` pode ser usada para detalhes decorativos; não a aplique automaticamente em texto pequeno sem validar contraste.

## Critérios de aceitação

- [ ] O hero reflete a capa da faixa atual e atualiza ao trocar de faixa.
- [ ] Uma troca rápida de faixas não permite que a capa anterior sobrescreva a cor nova.
- [ ] Fallback visual consistente em falha de carregamento, canvas indisponível ou CORS.
- [ ] Capas monocromáticas e extremas não produzem fundo branco/preto puro inesperado.
- [ ] Texto, ícones, botões, foco e estados desabilitados continuam legíveis.
- [ ] A transição é suave, sem flash, layout shift ou animação excessiva.
- [ ] A implementação reutiliza componentes, estado, tema e convenções existentes.
- [ ] Testes cobrem conversões RGB/HSL, score, hex, clusters vazios, imagem inválida e troca obsoleta.
- [ ] Testes visuais manuais incluem capas claras, escuras, saturadas e em escala de cinza.
- [ ] Nenhuma otimização avançada ou dependência foi adicionada sem evidência.

## Procedimento do agente

1. Localize o hero de reprodução e o fluxo de dados da faixa/capa atual.
2. Inspecione os componentes e utilitários de cor existentes; reutilize-os se adequados.
3. Apresente um plano curto e liste os arquivos a alterar.
4. Implemente o menor conjunto de mudanças coerente com a arquitetura existente.
5. Rode os testes/lint/typecheck disponíveis e corrija regressões introduzidas.
6. Resuma arquivos alterados, comportamento, verificações executadas e limitações remanescentes.
