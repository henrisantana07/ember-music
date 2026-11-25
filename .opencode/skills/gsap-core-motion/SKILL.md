---
name: gsap-core-motion
description: Especialista em GSAP Core: tweens, timelines, easing, stagger, keyframes, callbacks e sequenciamento.
---

# GSAP Core Motion

Use em animações de entrada/saída, movimento, transformação, opacidade, sequências e coreografia de componentes.

## Documentação oficial
- https://gsap.com/docs/v3/GSAP/
- https://gsap.com/docs/v3/GSAP/Timeline/
- https://gsap.com/docs/v3/GSAP/gsap.to()
- https://gsap.com/docs/v3/GSAP/gsap.from()
- https://gsap.com/docs/v3/GSAP/gsap.fromTo/
- https://gsap.com/docs/v3/GSAP/Eases/
- https://gsap.com/docs/v3/GSAP/Staggers/

Consulte a página exata da API antes de usar propriedades ou métodos específicos.

## Processo
1. Identifique se um tween isolado basta ou se a sequência exige timeline.
2. Defina estados inicial/final e comportamento de reverse/interrupção.
3. Use labels e position parameter para coreografia legível; evite cadeias de delays difíceis de manter.
4. Use stagger quando elementos repetidos devem entrar em sequência.
5. Escolha ease coerente com intenção; não use ease elástico/bounce por padrão.
6. Use defaults na timeline apenas quando realmente compartilhados.
7. Armazene referências apenas se precisar controlar/reverter/limpar a animação.

## Cuidados
- Evite conflitos entre GSAP e CSS que tentam controlar a mesma propriedade.
- Evite criar timelines novas a cada render.
- Não use `from()` sem considerar immediateRender e estado inicial.
- Não anime dimensões/layout em loops se transform/opacity forem suficientes.
- Não use animação infinita sem motivo e sem considerar consumo de bateria.
- Garanta cleanup via contexto ou mecanismo equivalente do framework.

## Critérios
Código legível, sequência determinística, estados reversíveis e valores fáceis de ajustar. Consulte também `gsap-quality-performance` quando houver jank, acessibilidade ou adaptação a dispositivos.
