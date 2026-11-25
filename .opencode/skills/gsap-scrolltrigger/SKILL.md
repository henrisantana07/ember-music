---
name: gsap-scrolltrigger
description: Especialista em GSAP ScrollTrigger para animações acionadas pelo scroll, scrub, pinning, snapping e scrollers personalizados.
---

# GSAP ScrollTrigger

## Documentação oficial
- https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- https://gsap.com/resources/st-mistakes/
- https://gsap.com/docs/v3/GSAP/gsap.matchMedia/

Sempre confirme a sintaxe e as opções na documentação atual.

## Processo
1. Identifique o scroller real, fluxo do documento e elemento trigger.
2. Escolha entre trigger pontual, timeline controlada por ScrollTrigger ou scrub contínuo.
3. Defina start/end em relação ao layout real; evite números arbitrários sem validar viewport.
4. Use pin somente quando a narrativa visual exigir; confira ancestrais com transform, overflow e stacking context.
5. Avalie scrub, snap, toggleActions e callbacks conforme o comportamento esperado.
6. Considere refresh após conteúdo dinâmico, imagens/fontes, accordions ou mudanças de layout.
7. Em layouts responsivos, use matchMedia e crie configurações específicas por breakpoint.
8. Teste scroll para frente/trás, resize, navegação e mobile.

## Debug e armadilhas
- Use markers temporariamente.
- Evite criar triggers duplicados em rerenders.
- Não force refresh em cada frame.
- Não assuma que pin funciona igual dentro de qualquer ancestral/overflow.
- Evite combinar smooth-scroll externo sem estudar integração e scrollerProxy.
- Não faça scroll-jacking; mantenha scroll nativo por padrão.
- Remova markers e listeners de debug ao finalizar.

## Integração
Em React/Next, leia também `gsap-react-frameworks`. Para jank, layout shifts e reduced motion, leia `gsap-quality-performance`.
