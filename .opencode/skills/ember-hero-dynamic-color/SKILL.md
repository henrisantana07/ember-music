---
name: ember-hero-dynamic-color
description: "Design and implement per-track dynamic hero backgrounds for Ember Music's playback screen, inspired by Spotify's album-art color treatment. Use when working on /reproducao, the global player, cover artwork, color extraction, gradients, transitions, or playback visual theming."
---

# Ember Music — Dynamic Hero Color

## Objetivo

Criar um fundo dinâmico para o hero de reprodução que derive uma paleta da capa da faixa atual, com estética de streaming premium: cor dominante escurecida no topo, transição suave para a superfície escura do Ember Music, texto legível e troca visual sem flashes. A cor deve acompanhar a faixa efetivamente selecionada/em reprodução, incluindo faixas Deezer, YouTube e biblioteca local quando houver artwork acessível.

## Regras obrigatórias para trabalhar no repositório

1. Antes de editar, inspecione a página `/reproducao`, o Player global, o modelo compartilhado de Track, os stores Zustand e os componentes de artwork existentes. Identifique a fonte real da capa e o identificador estável da faixa.
2. Reutilize os componentes, estados, tokens, controles e padrões visuais existentes. Não crie outro player, store, sistema de favoritos, nem uma arquitetura paralela.
3. Mantenha a lógica de extração isolada em utilitário/hook testável. O hero recebe apenas tokens CSS ou um resultado tipado; não deve conter o algoritmo de clustering.
4. Não altere a reprodução, a fila, favoritos, playlists, histórico ou integração com provedores para implementar apenas a cor.
5. Preserve o layout responsivo mobile-first, o tema atual e alvos de toque de pelo menos 48 dp. A camada decorativa nunca deve interceptar cliques.
6. Faça alterações mínimas e compatíveis com a estrutura que já existe; não presuma caminhos de arquivo antes de inspecionar o repositório.

## Estratégia recomendada

Use a seguinte ordem, priorizando qualidade visual, simplicidade e estabilidade:

1. **Fonte da capa:** use a URL de artwork já resolvida pelo modelo da faixa; prefira a imagem de maior resolução disponível sem fazer uma nova chamada de API só para extrair cor.
2. **Cache:** cacheie o resultado por URL normalizada da imagem (ou artwork ID + versão). Não extraia novamente a cada render, seek, alteração de volume ou atualização da posição da faixa.
3. **Extração inicial:** prefira uma biblioteca pequena e mantida, como `fast-average-color`, se já for compatível com a arquitetura. Caso contrário, use Canvas com downsampling e uma implementação própria testada. Média de cor é a opção mais simples; clustering é útil quando a média mistura cores que não representam bem a capa.
4. **Amostragem:** reduza a imagem para cerca de 64–100 px no maior eixo, preservando a proporção. Use `Uint8ClampedArray`/`Float32Array` e evite arrays de objetos por pixel.
5. **Clustering opcional:** se o resultado médio for visualmente fraco, aplique K-Means com k=5–8 sobre a amostra reduzida, calcule a ocupação de cada cluster e escolha uma cor que equilibre presença, cromaticidade e luminosidade. Para uma única capa pequena, K-Means completo sobre a amostra reduzida é preferível a GPU/WASM ou a Mini-Batch de apenas 32 amostras.
6. **Pós-processamento:** converta para HSL, limite luminosidade e saturação para um fundo escuro elegante, e gere uma cor de apoio. Não aplique apenas um boost de saturação fixo sem limites.
7. **Gradiente:** use a cor tratada como glow/parte superior e faça fade até o token de superfície escura real do app (fallback sugerido: `#121212`, somente se esse for o token do projeto). Considere gradiente radial sutil combinado com linear para não colorir excessivamente toda a página.
8. **Transição:** anime somente propriedades adequadas, preferencialmente opacidade de uma camada de gradiente ou custom properties CSS com transição curta (aprox. 250–450 ms). Evite animar layout, filtros caros ou toda a árvore React.
9. **Falhas:** capa ausente, imagem quebrada, canvas bloqueado por CORS ou cor inválida devem manter o fundo padrão sem interromper o player.
10. **Validação:** teste mudanças rápidas de faixa, faixas sem capa, capas monocromáticas, imagem CORS, navegação para trás/frente, responsividade e contraste.

## Nota de rigor sobre a referência Spotify

A fórmula e os pesos fornecidos como “pipeline real do Spotify” não devem ser apresentados como implementação interna confirmada. Trate-os como uma heurística inspirada em pesquisa de colorfulness e em observações visuais. A expressão de chroma `sqrt((R-G)^2 + (((R+G)/2)-B)^2)` pode ajudar a favorecer cores cromáticas, mas não prova que o Spotify use esses pesos ou esse pipeline. Se os pesos forem implementados, documente-os como parâmetros ajustáveis do Ember Music e valide-os com capas reais.

A fórmula de luminância do texto de referência é uma aproximação RMS, não a luminância relativa WCAG. Para acessibilidade, calcule contraste usando sRGB linearizado e a fórmula de luminância relativa WCAG; não confie na luminosidade HSL isoladamente para decidir a cor do texto.

## Interface TypeScript sugerida

Mantenha a API pequena e independente do player:

```ts
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HeroColorResult {
  primary: string;   // cor escura derivada da capa
  accent: string;    // detalhe/glow, sem ser usada automaticamente como texto
  gradient: string;  // fundo CSS pronto
}

export function extractHeroColor(
  imageData: ImageData
): HeroColorResult;
```

O hook deve aceitar uma URL nula e expor estado previsível. Adapte nomes e diretórios aos padrões existentes:

```ts
type HeroColorState =
  | { status: "idle"; color: null }
  | { status: "loading"; color: HeroColorResult | null }
  | { status: "ready"; color: HeroColorResult }
  | { status: "error"; color: null };
```

Requisitos para o hook:
- Limpar o resultado anterior corretamente quando a faixa não tiver artwork.
- Ignorar respostas atrasadas de uma imagem anterior; usar cancelamento/flag de validade ou AbortController quando aplicável.
- Limpar handlers e referências no cleanup.
- Manter a cor anterior durante o carregamento da próxima capa, se isso evitar flash, mas não permitir que uma resposta antiga sobrescreva a cor da faixa atual.
- Limpar/expirar o cache de forma limitada se ele puder crescer sem controle.
- Definir `crossOrigin = "anonymous"` antes de `src`. Canvas só pode ler pixels se a origem permitir CORS. Se a imagem vier de origem sem CORS, usar um proxy de imagem já existente e autorizado no backend; não desativar a segurança do navegador nem criar um proxy aberto. Nunca expor segredos de API no cliente.

## Exemplo de integração visual

Integre no hero existente de `/reproducao`; isto é um padrão ilustrativo, não uma instrução para criar um componente duplicado:

```tsx
<div
  className="playback-hero"
  style={{
    background: color?.gradient ?? "var(--color-surface)",
  }}
>
  {/* Mantenha aqui o artwork, metadados e controles existentes. */}
</div>
```

Preferir CSS para o acabamento e reduzir re-renderizações:

```css
.playback-hero {
  position: relative;
  isolation: isolate;
  overflow: clip;
  background-color: var(--color-surface);
  transition: background-color 300ms ease;
}

.playback-hero__color-layer {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(180deg, var(--hero-color, transparent) 0%, var(--color-surface) 88%),
    radial-gradient(ellipse at 50% 0%, var(--hero-accent, transparent), transparent 68%);
  transition: opacity 350ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .playback-hero,
  .playback-hero__color-layer {
    transition: none;
  }
}
```

Adapte os tokens CSS ao design system existente. Garanta que a camada fique atrás do conteúdo sem alterar a ordem de foco ou os controles interativos.

## Seleção da cor: heurística sugerida

Quando implementar clustering, avalie cada cluster usando:
- **Dominância:** proporção de pixels atribuídos ao cluster.
- **Cromaticidade:** favoreça cores visualmente distintas, sem deixar uma pequena área neon dominar o fundo.
- **Luminosidade:** prefira uma cor suficientemente escura para combinar com a interface, escurecendo-a em HSL/LCH após a seleção.
- **Qualidade visual:** penalize branco/preto quase puros e cores que produzam um gradiente excessivamente luminoso.

Os pesos devem ser configuráveis e testados. Evite tratar uma única pontuação como verdade universal: capas monocromáticas, muito claras, com bordas grandes ou gradientes podem precisar de fallback ou escolha do segundo melhor cluster.

## Performance e decisões

- **Padrão recomendado:** downsample + Typed Arrays + K-Means pequeno (se necessário) + cache. Execute uma vez por nova capa.
- Não implemente Elkan, Mini-Batch, WebGL2 ou WASM inicialmente. São complexidades adicionais sem benefício comprovado para uma imagem de capa reduzida.
- Mini-Batch com 32 pixels pode perder clusters importantes e não é a escolha padrão para qualidade de capa.
- Evite `Math.random()` sem seed se resultados reproduzíveis forem importantes para testes. Use inicialização determinística ou seed controlada.
- Não afirme garantias como “menos de 5 ms” sem medir em dispositivos e navegadores-alvo. Faça profiling antes de otimizar.
- Se o app já usa `fast-average-color` ou outro extrator, compare o resultado e reutilize a dependência antes de adicionar outra.

## Acessibilidade e acabamento

- O gradiente é decorativo; texto, botões e ícones devem continuar usando tokens de foreground acessíveis.
- Calcule contraste WCAG para texto relevante. Se branco não atingir o contraste necessário, ajuste a superfície/overlay ou use o token de texto apropriado.
- Não codifique toda a interface em branco por causa da cor extraída.
- Suporte `prefers-reduced-motion`.
- A cor não pode ser o único indicador de estado de reprodução.
- Não altere a paleta global do aplicativo; o efeito deve ficar contido no hero de reprodução.

## Plano de implementação

1. Auditar `/reproducao`, o player compartilhado, a estrutura de Track, as URLs de artwork e o sistema de tokens.
2. Escolher a menor estratégia viável: biblioteca já instalada primeiro; Canvas próprio apenas se necessário.
3. Implementar utilitário puro de cor e testes unitários para RGB/HEX/HSL, valores extremos e entradas inválidas.
4. Implementar hook com cache, estado de carregamento, CORS e proteção contra resultados obsoletos.
5. Integrar a cor no hero existente sem duplicar player ou controles.
6. Adicionar transição e fallback respeitando tokens, reduced motion e contraste.
7. Executar lint, typecheck e testes disponíveis; verificar builds e fluxos de reprodução existentes.
8. Entregar resumo dos arquivos alterados, decisões, testes executados e limitações confirmadas.

## Critérios de aceitação

- A cor muda quando a faixa/artwork atual muda e não quando mudam volume ou posição.
- Resultados de uma faixa anterior nunca substituem os da faixa atual.
- Sem artwork ou com erro de CORS, o player continua funcionando com o fundo padrão.
- O hero permanece legível, responsivo e visualmente consistente com o tema escuro.
- A extração é cacheada e não dispara novas chamadas aos provedores de música.
- Não há duplicação de componentes/estado do player.
- Testes, typecheck e lint disponíveis passam; qualquer falha preexistente é descrita separadamente.
