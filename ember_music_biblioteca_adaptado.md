# Ember Music — Guia de implementação da “Sua Biblioteca” com Material Design 3

> **Objetivo:** adaptar o guia de biblioteca musical inspirado no Spotify ao código e às ferramentas já presentes no Ember Music. Este documento é uma especificação de implementação para o agente de código; antes de alterar arquivos, ele deve inspecionar o repositório e confirmar os componentes, tipos, serviços e tabelas reais.

## 1. Princípios obrigatórios

1. **Inspecione antes de implementar.** Leia `package.json`, a estrutura de `src/`, os componentes de UI, a navegação, o estado global, os serviços de dados, `src/types/database.ts`, as migrations do Supabase e a página atual de playlists.
2. **Reutilize antes de criar.** Não duplique botões, menus, modais, snackbars, filtros, controles de lista, lógica de playlists, autenticação, reprodução ou persistência que já existam.
3. **Não invente APIs, componentes, tabelas ou colunas.** Confirme nomes, props, tipos e comportamento no código. Se algo citado neste documento não existir, procure a implementação equivalente e adapte-se a ela.
4. **Preserve a arquitetura atual.** Use TypeScript (`.ts`), React/TSX (`.tsx`) e JavaScript apenas onde o projeto já exigir. Não converta arquivos ou introduza uma nova arquitetura sem necessidade.
5. **Não instale dependências sem necessidade.** Prefira os pacotes já listados no `package.json`.
6. **Não quebre funcionalidades existentes.** Reutilize ações e botões presentes; evite substituir implementações funcionais por simulações ou mocks.
7. **Trabalhe em etapas pequenas**, verificando tipos, lint e testes depois das mudanças.
8. **Mantenha a identidade visual do Ember Music.** Use tokens, temas, superfícies, tipografia, estados e animações já existentes; use o Material Design 3 como referência de comportamento e acessibilidade, não como motivo para reconstruir o design system.

## 2. Ferramentas e dependências identificadas

O `package.json` do repositório consultado inclui:

- **Next.js 16, React 19 e TypeScript 5** para a aplicação web.
- **Tailwind CSS 4** para estilos.
- **`motion/react` / `motion`** para animações, se já usado pelo componente que será alterado.
- **Lucide React** para ícones.
- **Supabase JS e `@supabase/ssr`** para dados e autenticação.
- **Zustand** para estado global, quando o projeto já usar stores para a funcionalidade.
- **`@dnd-kit/core`, `@dnd-kit/sortable` e `@dnd-kit/utilities`** para drag-and-drop, caso a implementação atual de playlists já utilize esses pacotes.
- **Vitest**, Testing Library e jsdom para testes.
- **`idb`** para IndexedDB, se a biblioteca local ou o cache existente já depender dele.

Não acrescente Redux, outra biblioteca de drag-and-drop, outro sistema de animação ou uma nova biblioteca de componentes para esta funcionalidade sem demonstrar uma necessidade concreta.

## 3. Componentes existentes a verificar e priorizar

O guia de origem cita os componentes abaixo. Alguns arquivos foram conferidos no repositório e devem ser reutilizados se continuarem compatíveis com a branch atual:

| Componente | Uso pretendido | Cuidados |
|---|---|---|
| `src/components/ui/FilterChip.tsx` | Filtros de tipo e subfiltros | Já expõe `selected`, `onClick`, `onRemove`, `removeLabel`, `ariaLabel` e `disabled`. O chip visual tem altura `h-8`; garanta alvo interativo total de pelo menos 48 px. |
| `src/components/ui/SortMenu.tsx` | Ordenação | Componente genérico com `options`, `value`, `onChange` e `label`. Use somente opções válidas para o tipo atual. |
| `src/components/ui/SegmentedToggle.tsx` | Alternar compacto/lista/grade | Recebe `options`, `value`, `onChange` e `ariaLabel`. |
| `src/components/ui/ControlToolbar.tsx` | Barra de busca e controles | Exporta `SearchBar` e `ControlToolbar`; a busca recebe `value` e `onChange`. |
| `src/components/ui/Modal.tsx` | Criar pasta, confirmar remoção/movimentação | Inspecione a API real antes de usar; não suponha props. |
| `src/components/ui/Snackbar.tsx` | Feedback de sucesso, erro e desfazer | Reutilize o mecanismo de estado e o padrão já existentes. |
| `src/components/ui/IconButton.tsx` e `Button.tsx` | Ações e botões M3 | Botões só com ícone precisam de rótulos acessíveis. |
| `src/components/ui/Menu.tsx` | Menu “Criar” e menu de contexto | Reutilize `useMenu`, `MenuPanel`, `MenuItem` e `MenuPresence` se a API atual confirmar compatibilidade. |
| Modal de criação de playlist | Criar playlist | Localize o componente real e reutilize-o em vez de implementar outro fluxo. |
| `SkeletonCard` e `ErrorState` | Carregamento e falha | Confirme os exports e o padrão de uso existentes. |

**Importante:** não assuma que o caminho do modal de playlist, os exports de `SkeletonCard`/`ErrorState` ou as props de `Modal`, `Snackbar` e `IconButton` são exatamente os descritos em outros documentos. Leia as definições reais.

## 4. Tipos e modelo de dados

Crie tipos explícitos e estreitos em TypeScript. Adapte os nomes ao domínio já usado pelo Ember Music:

```ts
export type LibraryItemType =
  | 'playlist'
  | 'artist'
  | 'album'
  | 'track'
  | 'podcast'

export type LibraryView = 'compact' | 'list' | 'grid'

export type LibrarySort =
  | 'recent'
  | 'added'
  | 'alphabetical'
  | 'creator'
  | 'custom'
```

- `podcast` deve permanecer fora da UI se o projeto não oferecer esse tipo de conteúdo.
- Não use `any` para contornar diferenças entre dados do banco, resultados de APIs musicais e itens da biblioteca.
- Se os dados vierem de formatos diferentes, crie adaptadores tipados para normalizá-los em um modelo de apresentação de biblioteca.
- Use os tipos gerados ou existentes em `src/types/database.ts` como referência para o schema real.
- Os campos `created_at`, `played_at`, `folder_id`, `position`, `downloads` ou equivalentes só podem ser usados após confirmar que existem no banco e na lógica de dados.
- A tipagem local nunca deve declarar uma coluna que ainda não existe no Supabase.

Exemplo de modelo de UI, a adaptar ao schema real:

```ts
export interface LibraryItem {
  id: string
  type: LibraryItemType
  title: string
  subtitle?: string
  imageUrl?: string | null
  createdAt?: string | null
  playedAt?: string | null
  isPinned?: boolean
}
```

## 5. Funcionalidades e comportamento

### 5.1 Busca e filtros

- Implementar busca local na coleção carregada, sem disparar chamadas externas de busca musical a cada tecla.
- Normalizar caixa e acentos, por exemplo com `normalize('NFD')`, para que termos sem acento encontrem títulos acentuados.
- Aplicar filtros e busca por funções puras em TypeScript, separadas da UI, para facilitar testes.
- O filtro de tipo deve permitir seleção única e remoção do filtro ativo.
- Subfiltros devem aparecer apenas quando houver um tipo selecionado e somente se fizerem sentido para os dados disponíveis.
- Evitar estados inconsistentes: quando um tipo for trocado, limpar apenas os subfiltros e a ordenação incompatíveis com o novo tipo.
- O estado vazio da busca deve mostrar uma mensagem e uma ação para limpar a consulta.

API de exemplo, sem pressupor a estrutura final dos dados:

```ts
export function filterLibraryItems<T extends LibraryItem>(
  items: T[],
  query: string,
  type: LibraryItemType | null,
): T[] {
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()

  const normalizedQuery = normalize(query.trim())

  return items.filter((item) => {
    const matchesType = type === null || item.type === type
    const searchable = normalize(
      [item.title, item.subtitle ?? ''].join(' '),
    )
    return matchesType && searchable.includes(normalizedQuery)
  })
}
```

A função é um ponto de partida: ajuste os campos pesquisáveis ao modelo real, incluindo artista/álbum quando estiverem disponíveis.

### 5.2 Ordenação

- Reutilizar `SortMenu`.
- Implementar a ordenação em função pura e estável, sem mutar o array recebido.
- Disponibilizar apenas opções suportadas pelo tipo de item e pelos campos existentes.
- “Ordem personalizada” só aparece quando a reordenação manual estiver implementada e persistida.
- Não afirmar que existe ordenação por “última reprodução” ou “adicionado recentemente” sem uma fonte real para esses dados.

### 5.3 Modos de visualização

- Reutilizar `SegmentedToggle`.
- **Compacto:** linhas densas, sem capa quando isso fizer sentido.
- **Lista:** capa, título e subtítulo.
- **Grade:** capas em grade responsiva.
- Preservar rolagem e posição dos itens ao alternar modos sempre que possível.
- Reutilizar os componentes de capa/imagem e placeholders já usados no Ember Music.

### 5.4 Criar playlist e pasta

- O botão “Criar” deve reutilizar o botão de ícone e o menu existentes.
- A opção “Playlist” deve acionar o fluxo atual de criação de playlist.
- A opção “Pasta” só deve ser habilitada depois de confirmar o modelo de pastas, a persistência e as permissões.
- Validar nome vazio, espaços extras e duplicidade conforme as regras atuais do projeto.
- Exibir `Snackbar` de sucesso ou erro.
- Não simular gravação: aguardar a resposta real do serviço ou do Supabase.

### 5.5 Pastas, movimentação e reordenação

- Antes de criar migration, inspecionar migrations existentes, schema de playlists, tipos gerados, autenticação e políticas RLS.
- Confirmar se pastas já existem em código ou no banco.
- Se forem novas, elaborar migration compatível com o padrão do repositório, com chaves estrangeiras, índices e RLS adequados.
- Evitar ciclos na árvore de pastas e validar que o usuário só possa mover seus próprios itens.
- Para reordenação, reutilizar `@dnd-kit` se já for a solução do projeto; conferir o fluxo de `app/playlists/[id]/page.tsx` antes de copiar padrões.
- Persistir posições de forma consistente e lidar com falhas de rede sem deixar a UI permanentemente divergente do banco.

### 5.6 Fixar itens

- Primeiro verifique se o projeto já possui favoritos, pins ou uma funcionalidade equivalente. Não confunda “favoritar faixa” com “fixar item na biblioteca”.
- Se for necessário persistir fixados, defina o modelo somente após analisar o schema atual.
- O limite de 20 citado no documento de origem é uma regra proposta por aquele guia, não uma exigência técnica confirmada do Ember Music. Confirme o requisito antes de implementá-lo.
- Se houver limite, validá-lo também na lógica de negócio, e não apenas esconder o botão na interface.

### 5.7 Menu de contexto

- Reutilizar o menu existente para ações como abrir/reproduzir, fixar, mover e remover.
- Mostrar somente ações válidas para o tipo do item e o estado atual.
- Confirmar operações destrutivas com o `Modal` existente.
- Impedir propagação de eventos quando um menu estiver dentro de uma linha clicável, para evitar que o clique execute também a ação principal.
- Garantir navegação por teclado, Escape e retorno de foco conforme o comportamento que os componentes existentes suportam.

## 6. Persistência de preferências

Preferências exclusivamente visuais — filtro, modo de visualização, ordenação e largura do painel — podem ficar no `localStorage`, desde que o projeto não tenha uma abstração de persistência já padronizada.

Requisitos:

- Criar um hook genérico em TypeScript somente se não existir alternativa equivalente.
- Tratar indisponibilidade de `localStorage` com `try/catch`.
- Em Next.js, evitar acessar `localStorage` durante renderização no servidor.
- Evitar flash de conteúdo incorreto: carregar preferências no cliente de forma controlada.
- Validar valores recuperados; não confiar cegamente em JSON antigo.
- Não guardar tokens, segredos ou dados sensíveis no `localStorage`.
- Sincronização entre dispositivos exige persistência no backend e não deve ser presumida.

## 7. Layout responsivo e acessibilidade

- Seguir os breakpoints e o sistema de navegação já adotados pelo Ember Music.
- Em telas pequenas, integrar a biblioteca à navegação móvel existente; não criar uma segunda barra inferior se já houver uma.
- Alvo interativo mínimo recomendado pelo guia do projeto: **48 × 48 px**.
- Manter espaçamentos coerentes com os tokens existentes, preferencialmente na escala de 8 px usada pelo projeto.
- Não usar `overflow: hidden` indiscriminadamente nem cortar títulos sem necessidade.
- Botões só com ícones precisam de `aria-label` ou `label`.
- Chips devem comunicar estado selecionado; grupos de controles precisam de rótulos acessíveis.
- Menus e diálogos devem funcionar com teclado e leitor de tela, respeitando as capacidades dos componentes reutilizados.
- Verificar contraste nos temas claro e escuro.
- Respeitar os tokens de z-index existentes e o uso de portal dos menus e modais; confirmar a implementação antes de adicionar novas camadas.

## 8. Estados da interface

Toda operação assíncrona deve tratar:

- **Carregamento:** reutilizar o skeleton existente, com dimensões semelhantes ao conteúdo final.
- **Vazio:** informar que a biblioteca está vazia e oferecer uma ação relevante.
- **Sem resultados:** informar que a busca não encontrou itens e permitir limpar filtros/consulta.
- **Erro:** reutilizar o padrão `ErrorState` ou o equivalente real e permitir tentar novamente quando seguro.
- **Sucesso:** exibir `Snackbar` após a confirmação da operação.
- **Desfazer:** oferecer apenas quando houver uma forma real e consistente de reverter a operação.

Não mostrar sucesso antes da confirmação do banco ou do serviço.

## 9. Organização de código sugerida

Esta estrutura é uma proposta; encaixe-a na organização real e evite criar diretórios redundantes:

```text
src/
  components/
    LibraryPanel/
      index.tsx
      LibraryItem.tsx
      LibraryTree.tsx
      components/
        LibraryFilters.tsx
        LibraryViewControls.tsx
  hooks/
    useLibraryPreferences.ts
  lib/
    library/
      filterLibraryItems.ts
      sortLibraryItems.ts
      types.ts
  types/
    database.ts
```

- Componentes React e interface: `.tsx`.
- Funções puras, tipos e adaptadores sem JSX: `.ts`.
- JavaScript (`.js`/`.jsx`) somente quando houver uma convenção existente que justifique mantê-lo.
- Não duplique `src/types/database.ts`; edite-o apenas de acordo com o schema real ou gere novamente os tipos se esse for o fluxo do projeto.
- Não crie arquivos apenas para seguir esta árvore se a arquitetura atual tiver um local mais adequado.

## 10. Estratégia de testes e validação

Adicionar ou atualizar testes Vitest para:

1. Busca por título/subtítulo, incluindo acentos e diferenças entre maiúsculas e minúsculas.
2. Combinação de busca com filtro de tipo.
3. Ordenação por cada opção disponível, incluindo estabilidade e ausência de mutação.
4. Recuperação de preferências inválidas ou armazenamento indisponível.
5. Estados vazios, carregamento e erro.
6. Criação, movimentação, fixação e remoção, quando essas operações forem implementadas.
7. Acessibilidade dos controles principais e interação por teclado.

Após as mudanças, executar os scripts que realmente existem no `package.json`, por exemplo:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Se algum comando não estiver configurado ou exigir ambiente/variáveis indisponíveis, registrar isso explicitamente. Não afirmar que testes passaram sem executá-los.

## 11. Ordem de implementação recomendada

### Fase 1 — Auditoria e base funcional
- Mapear a página e a navegação atual da biblioteca.
- Conferir componentes UI e APIs reais.
- Identificar os tipos de itens que o Ember Music já suporta.
- Criar/ajustar funções puras de busca, filtro e ordenação.
- Implementar filtros e busca usando componentes existentes.

### Fase 2 — Visualização e preferências
- Adicionar compacto/lista/grade com `SegmentedToggle`.
- Integrar `SortMenu`.
- Persistir preferências locais com tratamento SSR do Next.js.
- Validar responsividade e acessibilidade.

### Fase 3 — Criação e menus
- Integrar o menu “Criar” ao fluxo atual de playlists.
- Implementar criação de pastas apenas após confirmar o modelo de dados.
- Reutilizar `Modal`, `Menu` e `Snackbar`.

### Fase 4 — Persistência avançada
- Se necessárias e inexistentes, adicionar pastas, fixados e campos de ordenação com migrations e RLS.
- Integrar movimentação e reordenação com a implementação já usada no projeto.
- Cobrir falhas de rede e sincronização de estado.

### Fase 5 — Layout e acabamento
- Implementar painel recolhível/redimensionável somente depois de estabilizar o conteúdo e conferir o layout principal.
- Integrar com a navegação móvel existente.
- Revisar animações, foco, z-index, contraste e performance.

## 12. Critérios de conclusão

A tarefa só está concluída quando:

- A biblioteca usa componentes existentes em vez de duplicá-los.
- Busca, filtros, ordenação e visualização operam sobre dados reais.
- Nenhuma funcionalidade existente de playlist, favoritos ou reprodução foi quebrada.
- Não foram adicionadas dependências redundantes.
- Toda alteração de banco tem migration, tipos e políticas compatíveis.
- Estados de carregamento, vazio e erro são tratados.
- Controles principais funcionam com teclado e leitor de tela.
- TypeScript, lint, testes e build foram executados; resultados e limitações são informados.
- Não há dados falsos, ações simuladas ou alegações de sucesso sem persistência confirmada.

## 13. Instrução final para o agente de código

Implemente esta especificação no repositório atual do Ember Music. **Comece pela auditoria, não pela escrita de código.** Inspecione a branch atual, identifique os arquivos e comportamentos existentes e apresente um plano curto de mudanças com os caminhos reais. Em seguida, implemente por fases, reutilizando as ferramentas disponíveis e preservando a arquitetura.

Não substitua componentes existentes por versões novas sem necessidade. Não invente schemas, props, APIs ou dependências. Se uma funcionalidade exigir mudança no Supabase, apresente a migration e os impactos antes de depender dela. Ao final, liste arquivos alterados, decisões importantes, comandos executados e resultados reais dos testes.


## Instrução obrigatória: substituir a interface antiga da Sidebar

**Não implemente a nova biblioteca como uma Sidebar paralela nem mantenha a interface antiga ativa.** A tarefa deve incluir a refatoração da Sidebar existente do Ember Music nos arquivos abaixo, substituindo a interface/frontend antigo pela nova interface adaptada ao projeto.

Arquivos-alvo obrigatórios:

```text
src/components/Sidebar/
├── Sidebar.tsx   # Componente principal; remover a dependência de JSON
├── types.ts      # Tipos usados pela Sidebar
└── index.tsx     # Implementação completa da Sidebar
```

### Regras para a substituição

1. **Audite primeiro** o conteúdo atual desses três arquivos e todos os locais que os importam ou renderizam. Identifique as props, exports, tipos, rotas, callbacks, estado e integrações existentes antes de editar.
2. **Substitua a UI antiga nos próprios arquivos-alvo.** Não crie uma `SidebarV2`, `NewSidebar`, uma segunda navegação paralela ou componentes duplicados para contornar a refatoração.
3. Em `Sidebar.tsx`, remova a dependência de JSON indicada pelo projeto e alimente a interface usando as fontes de dados e os serviços reais já existentes. Não invente dados, APIs ou tabelas.
4. Em `types.ts`, atualize os tipos necessários para a nova interface, mantendo compatibilidade com os usos reais do projeto. Não declare propriedades de banco de dados que não estejam presentes nos tipos, migrations ou consultas existentes.
5. Em `index.tsx`, atualize a composição e a implementação completa da Sidebar para refletir a nova interface. Preserve a integração com a navegação, o player, a biblioteca e os demais fluxos existentes que forem confirmados durante a auditoria.
6. Antes de remover ou renomear exports, props ou tipos, pesquise todos os seus usos e ajuste os consumidores necessários. Evite quebrar imports, rotas, layout responsivo ou funcionalidades já existentes.
7. Reutilize os componentes e ferramentas já instalados no Ember Music — incluindo os componentes de UI existentes, TypeScript/TSX, Tailwind CSS, `motion`, Lucide, Zustand e Supabase quando forem realmente pertinentes. Não adicione dependências sem necessidade comprovada.
8. Preserve a identidade visual do Ember Music. Aplique os padrões de Material Design 3 descritos neste documento onde forem compatíveis com a arquitetura e os componentes reais do projeto, sem introduzir um sistema visual duplicado.
9. Não mantenha a interface antiga escondida ou renderizada em paralelo como fallback permanente. Estados de carregamento, erro e vazio podem existir, mas devem pertencer à nova implementação e usar dados reais.
10. Valide os três arquivos e os consumidores afetados com os comandos de verificação disponíveis no projeto. Corrija erros de TypeScript, imports quebrados e problemas de build causados pela refatoração.

### Critérios de conclusão específicos da Sidebar

- [ ] A nova interface substituiu a interface antiga nos três arquivos indicados.
- [ ] `Sidebar.tsx` não depende mais do JSON que a implementação antiga utilizava.
- [ ] `types.ts` reflete os dados e contratos realmente usados.
- [ ] `index.tsx` apresenta a implementação atualizada sem criar uma Sidebar paralela.
- [ ] Todos os imports, exports, props e consumidores afetados continuam funcionando.
- [ ] Navegação, biblioteca, player e comportamento responsivo foram verificados conforme os recursos existentes.
- [ ] Os testes, a verificação de tipos e o build foram executados quando disponíveis; o agente deve informar os resultados reais, sem afirmar que verificou algo que não executou.

**Ordem de execução:** auditar os três arquivos e seus consumidores → mapear os contratos e dados reais → substituir a interface antiga nesses arquivos → adaptar os usos afetados → executar verificações → relatar arquivos alterados, funcionalidades preservadas e resultados dos testes.
