---
name: gsap-quality-performance
description: Especialista em qualidade, responsividade, acessibilidade, reduced motion, performance e depuração de animações GSAP.
---

# GSAP Quality, Performance & Accessibility

## Documentação oficial
- https://gsap.com/docs/v3/GSAP/gsap.matchMedia()
- https://gsap.com/docs/v3/GSAP/gsap.context()
- https://gsap.com/resources/
- https://web.dev/articles/animations-guide

Priorize GSAP para comportamento de animação e fontes web.dev/W3C para fundamentos de browser e acessibilidade.

## Auditoria
1. Identifique animações duplicadas, triggers/listeners órfãos e atualizações por frame desnecessárias.
2. Procure animações de propriedades que causam layout/paint; avalie transform e opacity quando equivalentes.
3. Avalie imagens, fontes, conteúdo dinâmico e mudanças de layout que alteram medidas.
4. Teste mobile realista, viewport estreita, orientação e dispositivos de menor desempenho.
5. Considere `prefers-reduced-motion` e ofereça experiência funcional alternativa.
6. Preserve foco, navegação por teclado, semântica e leitura assistiva.
7. Verifique CLS, overflow, scroll trapping, flicker e flash de estado inicial.
8. Use matchMedia/context para montar e limpar configurações por contexto/breakpoint.

## Depuração
- Reduza o caso ao menor componente que reproduz o erro.
- Confirme versão, imports, registro de plugin e ordem de inicialização.
- Inspecione console e lifecycle antes de alterar timings.
- Para ScrollTrigger, use markers temporários e inspecione start/end/refresh.
- Evite refresh global repetido, ticker extra e loops manuais sem necessidade.
- Compare comportamento com reduced motion habilitado.

## Critério de aceite
A animação deve permanecer funcional, responsiva, acessível e limpa ao desmontar o componente. Não aceite apenas "parece funcionar" em um único viewport.
