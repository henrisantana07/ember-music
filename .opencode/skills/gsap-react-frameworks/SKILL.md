---
name: gsap-react-frameworks
description: Especialista em integração GSAP com React, Next.js e frameworks baseados em componentes, incluindo refs, useGSAP, SSR e cleanup.
---

# GSAP em React e frameworks

## Documentação oficial
- https://gsap.com/resources/React/
- https://gsap.com/docs/v3/GSAP/gsap.context/
- https://gsap.com/docs/v3/Installation/

Confirme versão instalada de gsap e @gsap/react antes de recomendar APIs.

## Processo React/Next
1. Inspecione versão React/Next, client/server boundaries e componente alvo.
2. Animação que acessa DOM deve ocorrer no ambiente client e após os elementos existirem.
3. Prefira `useGSAP()` de `@gsap/react` quando apropriado; verifique instalação e import oficial.
4. Use refs para escopo e alvos; evite seletores globais que atinjam outras instâncias.
5. Registre plugins necessários no local apropriado, sem espalhar registro desnecessário.
6. Garanta revert/cleanup em unmount, mudança de dependências e Strict Mode.
7. Para handlers executados depois da inicialização, use o padrão documentado para manter animações no contexto (ex.: contextSafe quando aplicável).
8. Evite criar animações em render, efeitos sem dependências corretas ou manipular DOM que React também controla.
9. Teste hidratação, navegação entre rotas e reentrada no componente.

## Regras
- Não acessar `window`, `document` ou DOM durante renderização server-side.
- Não presumir que todo arquivo é Client Component; inspecione boundaries.
- Não esconder problemas de hidratação com suppressHydrationWarning.
- Não deixar ScrollTriggers/tweens vivos após unmount.
- Não criar refs para cada filho se um escopo de container resolver.
- Se a API mudou entre versões, priorize a documentação correspondente à versão instalada.

Para scroll, combine com `gsap-scrolltrigger`; para problemas de performance, `gsap-quality-performance`.
