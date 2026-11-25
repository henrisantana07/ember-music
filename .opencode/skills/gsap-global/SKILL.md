---
name: gsap-global
description: Orquestra qualquer implementação, auditoria ou correção com GSAP. Consulta a documentação oficial atual, identifica o padrão de animação e delega casos especializados às skills secundárias adequadas.
---

# GSAP Global — Orquestrador adaptativo

## Missão

Ser a skill de entrada para qualquer tarefa com GSAP, em qualquer projeto, framework ou componente. Não presuma que a solução é sempre uma timeline, ScrollTrigger ou React. Primeiro entenda o objetivo visual, o DOM, o framework, o ciclo de vida e as restrições do projeto; depois escolha a menor solução robusta.

Esta skill é global e reutilizável. Não está limitada ao Ember Music, Next.js ou a uma identidade visual específica.

## Regra principal: documentação antes de implementação

A documentação oficial é a fonte de verdade:

- Índice: https://gsap.com/docs/v3/
- Core GSAP: https://gsap.com/docs/v3/GSAP/
- Plugins: https://gsap.com/docs/v3/Plugins/
- Instalação: https://gsap.com/docs/v3/Installation/
- Learning Center: https://gsap.com/resources/

Antes de escrever ou alterar código:
1. Inspecione package.json, framework, versões, bundler, estrutura do componente e convenções locais.
2. Classifique a necessidade de animação e identifique APIs/plugins potencialmente relevantes.
3. Pesquise e extraia os trechos relevantes da documentação oficial atual (não dependa apenas de conhecimento memorizado).
4. Registre mentalmente/na resposta as URLs consultadas e diferencie API documentada de decisão de design.
5. Se a documentação estiver ambígua, incompleta ou houver comportamento inesperado, aprofunde a pesquisa e acione uma skill secundária.
6. Não invente métodos, propriedades, plugins, parâmetros ou compatibilidades. Se não confirmar algo, declare a incerteza e continue pesquisando.

Use busca e leitura de páginas oficiais GSAP (por exemplo, navegador/Firecrawl disponível no ambiente). Priorize páginas docs.gsap.com / gsap.com. Fontes externas servem como complemento, nunca substituem a documentação oficial.

## Fluxo adaptativo

### Fase A — Diagnóstico
- O que deve acontecer visualmente e em qual estado/evento?
- Qual elemento ou componente controla a animação?
- A animação é temporal, acionada por scroll, interação, navegação, carregamento, gesto ou mudança de estado?
- É necessário sincronizar múltiplos elementos?
- O projeto usa React/Next, Vue, Angular, vanilla JS, Webflow ou outra plataforma?
- Há requisitos mobile, reduced motion, SSR/hidratação, acessibilidade ou desempenho?
- Já existe GSAP, plugin, timeline ou sistema de motion no projeto?

Não faça perguntas se a resposta puder ser obtida inspecionando o código. Pergunte apenas quando faltar uma decisão visual/funcional essencial.

### Fase B — Seleção de estratégia
Escolha a alternativa mais simples que satisfaça o objetivo:
- Um efeito isolado: `gsap.to()`, `gsap.from()` ou `gsap.fromTo()`.
- Sequência/coordenar vários elementos: `gsap.timeline()`.
- Entrada/saída ao rolar: ScrollTrigger.
- Animação ligada continuamente ao progresso do scroll: ScrollTrigger com scrub.
- Mudança de layout/estado visual: FLIP.
- Elementos SVG, desenho, morph ou percurso: plugin SVG apropriado.
- Texto por caracteres/palavras/linhas: SplitText ou alternativa CSS/DOM adequada.
- Arrastar, observar gestos ou interação avançada: Draggable/Observer.
- React: preferir integração oficial `@gsap/react` / `useGSAP()` quando adequada.
- Animação simples de estado/hover: considerar CSS antes de adicionar GSAP.
- Animações responsivas: `gsap.matchMedia()` ou abordagem recomendada na documentação atual.

Não use plugin apenas porque existe. Confirme necessidade, disponibilidade/licença, instalação, import e registro.

### Fase C — Delegação obrigatória quando especializada ou incerta

Consulte a skill secundária relevante antes de implementar quando:
- o componente envolve scroll, pinning, scrub, snapping ou scroller customizado;
- React/Next envolve refs, Strict Mode, SSR, hidratação, rotas ou cleanup;
- há SVG, morph, path, DrawSVG ou MotionPath;
- há divisão/animação avançada de texto;
- há FLIP, drag, Observer, gestos ou interação;
- há performance, acessibilidade, reduced motion, responsividade ou bugs difíceis;
- a documentação não esclarece a API ou existem múltiplas soluções plausíveis.

Skills secundárias:
- `.opencode/skills/gsap-core-motion/SKILL.md` — tweens, timelines, eases, stagger, sequencing.
- `.opencode/skills/gsap-scrolltrigger/SKILL.md` — scroll, scrub, pin, snap, refresh, scrollers.
- `.opencode/skills/gsap-react-frameworks/SKILL.md` — React, Next.js, useGSAP, lifecycle, SSR.
- `.opencode/skills/gsap-svg-motion/SKILL.md` — SVG, DrawSVG, MorphSVG, MotionPath.
- `.opencode/skills/gsap-text-motion/SKILL.md` — SplitText, ScrambleText, texto acessível.
- `.opencode/skills/gsap-interaction-flip/SKILL.md` — Flip, Draggable, Observer, gestos.
- `.opencode/skills/gsap-quality-performance/SKILL.md` — performance, acessibilidade, responsividade, debugging.

Como delegar:
1. Leia a skill secundária completa antes de executar a especialidade.
2. Se houver mais de uma dimensão, combine as skills necessárias (ex.: React + ScrollTrigger).
3. A skill principal continua responsável por integrar as decisões e verificar compatibilidade.
4. Não delegue tudo indiscriminadamente: use apenas as skills que correspondem ao componente/caso.
5. Se nenhuma secundária cobrir a dúvida, pesquise a documentação oficial diretamente e proponha uma nova skill especializada apenas se o padrão for reutilizável.

### Fase D — Implementação segura
- Preserve arquitetura, estilo, naming, convenções e lógica existente.
- Faça alterações mínimas e localizadas.
- Evite seletores globais frágeis; prefira refs/escopo de componente quando aplicável.
- Em React, garanta cleanup/revert e compatibilidade com montagem/desmontagem.
- Registre plugins necessários corretamente e confirme imports/versões.
- Evite animar propriedades que provoquem layout continuamente; prefira transform/opacity quando visualmente equivalente.
- Não introduza dependências sem justificar.
- Não deixe animações duplicadas, listeners órfãos, ScrollTriggers órfãos ou estados visuais presos.
- Não altere comportamento funcional do componente para obter apenas um efeito visual.

### Fase E — Validação
Verifique:
- estado inicial sem flash/FoUC;
- início, meio, fim, reverse e interrupção quando aplicável;
- resize, breakpoints e orientação mobile;
- navegação/remoção do componente e cleanup;
- reduced motion e teclado/foco quando há interação;
- console, TypeScript, lint, testes e build disponíveis;
- ausência de overflow, CLS, scroll preso e sobreposição indevida.

Use markers do ScrollTrigger apenas durante debug e remova-os antes de concluir.

## Regras de qualidade

- Uma animação deve comunicar hierarquia, estado ou feedback — não apenas decorar.
- Prefira motion consistente e reutilizável, com duração/ease coerentes.
- Não imponha timings universais: adapte à distância, peso visual, contexto e input.
- Não copie exemplos da documentação sem adaptar seletores, lifecycle e cleanup ao projeto.
- Não substitua CSS transitions por GSAP sem benefício real.
- Não use `setTimeout` para sincronizar animações se timeline/callbacks/estado resolverem melhor.
- Considere `prefers-reduced-motion`; ofereça alternativa que preserve compreensão e funcionalidade.
- Para animações ligadas a scroll, mantenha o scroll nativo salvo requisito explícito.
- Não afirme que documentação foi extraída/validada se não foi efetivamente consultada.

## Entrega

Ao concluir, informe:
1. estratégia escolhida e por que ela se adapta ao componente;
2. APIs/plugins usados e documentação oficial consultada;
3. skills secundárias acionadas e motivo (ou por que não foram necessárias);
4. arquivos alterados;
5. validações executadas e limitações restantes.

Se a tarefa for apenas planejamento, não altere arquivos. Se for implementação, não faça commit, merge ou deploy sem autorização explícita.
