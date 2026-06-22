# Prompt Dedicado — Página de Configurações do Usuário · EmberMusic (Antigravity)

Use este prompt como complemento ao prompt principal do projeto. Cole no Antigravity quando for implementar especificamente a página `/configuracoes`.

---

## CONTEXTO

Implementar a página de configurações do usuário do **EmberMusic**, acessada ao clicar no avatar/foto de perfil no topbar. É uma **página dedicada** (`/configuracoes`), não um modal — o layout principal (sidebar + topbar + player fixo inferior) permanece montado. Rota protegida: redirecionar para login se o usuário não estiver autenticado.

A página é dividida em **4 seções**: Perfil, Aparência, Preferências de Reprodução e Notificações. Todas as alterações são **salvas automaticamente (auto-save)** — sem botão de "Salvar". Persistência no **Supabase** (tabela `profiles` e `user_settings`).

---

## LAYOUT GERAL DA PÁGINA

Estrutura em duas colunas:

```
┌──────────────────────────────────────────────────────────┐
│  TOPBAR (existente, com avatar clicável)                 │
├────────────────┬─────────────────────────────────────────┤
│                │                                         │
│  MENU LATERAL  │   CONTEÚDO DA SEÇÃO ATIVA               │
│  (sticky)      │   (área principal, scrollável)          │
│                │                                         │
│  • Perfil      │                                         │
│  • Aparência   │                                         │
│  • Reprodução  │                                         │
│  • Notificações│                                         │
│                │                                         │
├────────────────┴─────────────────────────────────────────┤
│  PLAYER FIXO INFERIOR (existente)                        │
└──────────────────────────────────────────────────────────┘
```

- Menu lateral esquerdo: sticky, largura fixa (~220px), lista de seções com indicador ativo (barra lateral fina em gradiente laranja→amarelo, igual ao padrão do projeto na sidebar)
- Conteúdo à direita: scroll independente, padding generoso, máximo de 680px de largura para manter boa leiturabilidade (não esticar até a borda em telas largas)
- Em mobile: menu lateral vira tabs horizontais no topo da página, conteúdo em coluna única

---

## AUTO-SAVE — COMPORTAMENTO GLOBAL

- **Não existe botão "Salvar"** em nenhuma seção — toda mudança persiste automaticamente
- Para campos de texto (nome, bio): debounce de 800ms após parar de digitar antes de disparar o save — não salvar a cada letra
- Para toggles, selects e sliders: salvar imediatamente ao mudar o valor
- Feedback visual de save: ícone de check verde sutil (✓ "Salvo") aparece discretamente ao lado do campo por 2 segundos após confirmar o save no Supabase — nunca um toast agressivo para cada campo
- Em caso de erro ao salvar: toast de erro específico ("Não foi possível salvar. Tente novamente.") com botão de retry — nunca falhar silenciosamente
- Estado de loading durante o save: campo fica com opacidade levemente reduzida (0.7) e cursor `wait` — não travar a UI inteira

---

## SEÇÃO 1 — PERFIL

### Foto de perfil
- Exibir foto atual em círculo (80x80px) com botão de overlay "Trocar foto" aparecendo no hover (ícone de câmera + texto)
- Ao clicar: abrir seletor de arquivo nativo (`input type="file"`) — aceitar apenas `image/jpeg`, `image/png`, `image/webp`, tamanho máximo 5MB
- Após seleção: abrir **cropper inline** (não modal separado) logo abaixo do avatar, permitindo recorte em formato circular 1:1 antes de fazer upload — usar biblioteca `react-easy-crop` ou similar
- Upload do arquivo cropado para **Supabase Storage** (bucket `avatars`, path: `{user_id}/avatar.{ext}`)
- Após upload bem-sucedido: atualizar URL da foto na tabela `profiles` e refletir imediatamente no topbar e em toda a UI sem reload de página
- Fallback: se o usuário não tiver foto customizada, mostrar inicial do nome em círculo com fundo em gradiente laranja→amarelo (nunca quebrar com ícone genérico de usuário)

### Campos de texto
- **Nome de exibição:** input de texto, máximo 50 caracteres, contador de caracteres visível (`32/50`), pré-preenchido com o nome vindo do Google OAuth. Auto-save com debounce 800ms
- **Bio:** textarea, máximo 160 caracteres (estilo Twitter), contador visível, placeholder "Conte um pouco sobre seu gosto musical…", redimensionamento apenas vertical. Auto-save com debounce 800ms

### Informações somente leitura (não editáveis)
- **E-mail:** exibir o e-mail da conta Google com label "Conta Google — não editável", em `--text-secondary`, sem campo de input (para deixar claro que não é editável)
- **Membro desde:** data de criação da conta, formatada em português ("Membro desde março de 2025")

### Zona de perigo (rodapé da seção Perfil)
- Separada visualmente por uma linha divisória e título "Zona de perigo" em vermelho discreto (`--error`)
- Botão "Sair de todos os dispositivos" — chama `supabase.auth.signOut({ scope: 'global' })`, depois redireciona para login
- Botão "Excluir conta" — **nunca executar direto**: abrir modal de confirmação exigindo que o usuário **digite "EXCLUIR" no campo** para habilitar o botão de confirmar (padrão GitHub/Vercel). Ao confirmar: deletar dados do usuário no Supabase (cascade nas tabelas relacionadas) e deslogar

---

## SEÇÃO 2 — APARÊNCIA

### Tema
- Duas opções de tema: **Escuro** (padrão do projeto, paleta preto/laranja/amarelo) e **Claro** (light mode)
- Exibir como cards de preview visuais (miniatura do layout com as cores), não radio buttons ou selects — o usuário vê como vai ficar antes de escolher
- Card selecionado: borda em gradiente laranja→amarelo, `border-width: 2px`
- Ao clicar: aplicar tema imediatamente via troca de classe no `<html>` (`class="theme-dark"` / `class="theme-light"`), persistir preferência no Supabase e no `localStorage` (para aplicar antes do hydration na próxima visita, evitando flash de tema errado — FOUC)

### Tokens de cor do tema claro (light mode)
Definir como variáveis CSS sob `.theme-light`, substituindo os tokens do tema escuro:
- `--bg-base: #FAF8F5`
- `--bg-surface: #F0EDE8`
- `--bg-elevated: #E5E0D8`
- `--text-primary: #1A1512`
- `--text-secondary: #6B5F54`
- `--text-disabled: #B0A89E`
- Gradiente de destaque (`--accent-from` e `--accent-to`) permanecem iguais — é a identidade da marca, não muda com o tema
- Player fixo, sidebar e topbar devem respeitar os tokens — nenhum componente pode ter cor hardcoded

### Idioma
- Select com opções: Português (BR) — padrão, English
- Mudar idioma: salvar preferência no Supabase, recarregar a página para aplicar (reload é aceitável aqui, avisar o usuário antes: "A página será recarregada para aplicar o idioma.")
- Internacionalização via `next-intl` ou `i18next` — escolher a que melhor se integra ao Next.js App Router. Perguntar antes se houver dúvida

---

## SEÇÃO 3 — PREFERÊNCIAS DE REPRODUÇÃO

Todos os controles desta seção salvam imediatamente ao mudar (sem debounce, pois não são campos de texto).

### Qualidade de áudio
- Select ou grupo de radio buttons: **Normal** (128kbps), **Alta** (256kbps) — mapear para os parâmetros de bitrate da API do Jamendo (`audioformat` / `audiodlformat`)
- Label explicativo abaixo: "Qualidade mais alta usa mais dados de internet"

### Autoplay
- Toggle (switch): ao chegar ao fim de uma faixa, tocar automaticamente a próxima da fila ou uma faixa sugerida pelo Jamendo
- Quando ativado e a fila estiver vazia: buscar faixa similar via `/tracks/similar` da API do Jamendo usando a última faixa tocada como seed

### Crossfade
- Toggle para ativar + slider de intensidade (aparece apenas quando o toggle está ativo)
- Slider: 0 a 12 segundos, step de 1s, valor padrão 5s
- Implementar crossfade via Web Audio API: iniciar fade-out da faixa atual e fade-in da próxima `N` segundos antes do fim, onde `N` é o valor do slider
- Label dinâmico abaixo do slider: "Transição de {N} segundos entre faixas"

### Normalização de volume
- Toggle: equalizar o volume percebido entre faixas diferentes (evitar que uma faixa seja muito mais alta que outra)
- Implementar via Web Audio API (`GainNode`) aplicando o valor de `replaygain` retornado pelo Jamendo, se disponível; caso contrário, aplicar normalização básica por RMS

---

## SEÇÃO 4 — NOTIFICAÇÕES

Controles de notificações **dentro do app** (toasts/alertas na UI). Nenhuma notificação push ou e-mail — deixar isso claro na UI com um subtítulo discreto: "Alertas exibidos dentro do EmberMusic".

Cada item é um **toggle (switch)** com label e descrição curta:

| Toggle | Label | Descrição |
|---|---|---|
| Favorito adicionado | Confirmação ao favoritar | "Exibir confirmação ao favoritar uma faixa" |
| Download concluído | Aviso de download | "Notificar quando o download de uma faixa for concluído" |
| Erro de reprodução | Alertas de erro | "Avisar quando uma faixa não puder ser reproduzida" |
| Novidades do EmberMusic | Novidades | "Anúncios sobre novas funcionalidades do app" |

- Estado padrão de todos os toggles: **ativado**
- Salvar o estado de cada toggle individualmente no Supabase (coluna booleana na tabela `user_settings`)
- Ao desativar um toggle, aquele tipo de toast/alert específico não é mais exibido em nenhuma parte do app — o estado deve ser consultado pelo sistema de notificações global antes de disparar qualquer toast

---

## COMPONENTES DE UI DESTA PÁGINA (PADRÕES VISUAIS)

Todos os componentes devem seguir os design tokens do projeto:

- **Toggle/Switch:** trilho com fundo `--bg-elevated` (desativado) → gradiente laranja→amarelo (ativado). Thumb branco (`--text-primary`). Transição 200ms
- **Slider:** trilho preenchido com gradiente laranja→amarelo, thumb em `#FFC400` com sombra sutil, height 4px em repouso
- **Select/Dropdown:** fundo `--bg-surface`, borda `--bg-elevated`, texto `--text-primary`. No hover: borda em `--accent-solid`. Seta do select em `--text-secondary`
- **Input de texto:** mesma estética do select. No foco: borda em `--accent-solid` com `outline: none` (o border é o foco visual)
- **Divisor entre seções:** `<hr>` com cor `--bg-elevated`, sem margin exagerada
- **Labels de campo:** `font-size: 14px`, peso 500, cor `--text-primary`
- **Descrições/sublabels:** `font-size: 13px`, peso 400, cor `--text-secondary`

---

## ESTRUTURA DE DADOS NO SUPABASE

### Tabela `profiles` (existente, expandir se necessário)
```sql
id uuid references auth.users primary key,
display_name text,
bio text,
avatar_url text,
created_at timestamptz default now()
```

### Tabela `user_settings` (criar)
```sql
id uuid references auth.users primary key,
theme text default 'dark',           -- 'dark' | 'light'
language text default 'pt-BR',       -- 'pt-BR' | 'en'
audio_quality text default 'normal', -- 'normal' | 'high'
autoplay boolean default true,
crossfade boolean default false,
crossfade_duration int default 5,    -- segundos
volume_normalization boolean default true,
notif_favorite boolean default true,
notif_download boolean default true,
notif_error boolean default true,
notif_news boolean default true,
updated_at timestamptz default now()
```

- Criar registro em `user_settings` automaticamente no momento do primeiro login (trigger no Supabase ou lógica no callback de auth do Next.js)
- Nunca deixar o usuário em estado sem registro nessa tabela — usar upsert nas operações de save

---

## EDGE CASES E TRATAMENTO DE ERROS

- **Upload de foto > 5MB:** validar client-side antes de enviar, exibir mensagem inline abaixo do campo ("A foto deve ter no máximo 5MB"), nunca deixar o erro vir do Supabase
- **Formato de arquivo inválido:** mesmo tratamento — validar antes do upload, mensagem inline
- **Falha no upload da foto:** reverter para foto anterior na UI, toast de erro com retry
- **Usuário tenta excluir a conta mas digita "EXCLUIR" errado:** botão de confirmar permanece desabilitado (`opacity: 0.4`, `cursor: not-allowed`) — nunca habilitar com texto incorreto
- **Preferência de tema não carregada antes do hydration:** ler `localStorage` no `<head>` via script inline (antes do React hidratar) para aplicar a classe de tema imediatamente e evitar FOUC — padrão obrigatório para apps com multiple themes no Next.js
- **Seção sem dados ainda (primeiro acesso):** mostrar valores padrão de cada campo, nunca campos vazios sem contexto

---

## PERGUNTAS QUE VOCÊ DEVE ME FAZER ANTES DE IMPLEMENTAR

- Se a biblioteca de crop de imagem (`react-easy-crop` ou similar) gerar conflito com a versão do Next.js/React do projeto, sugira alternativa antes de implementar
- Se o `next-intl` ou `i18next` já estiver ou não estiver no projeto — perguntar para evitar instalar duas soluções de i18n
- Se houver dúvida sobre a estrutura do trigger do Supabase para criação automática do registro em `user_settings` no primeiro login, detalhar a implementação sugerida antes de codificar
- Se o bitrate solicitado (128kbps / 256kbps) não estiver disponível nos parâmetros da API do Jamendo para todas as faixas, avisar antes para decidir o fallback