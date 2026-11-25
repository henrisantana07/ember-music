---
name: gsap-svg-motion
description: Especialista em animação de SVG com GSAP: atributos, DrawSVG, MorphSVG, MotionPath e geometria vetorial.
---

# GSAP SVG Motion

## Documentação oficial
- https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/
- https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/
- https://gsap.com/docs/v3/Plugins/MotionPathPlugin/
- https://gsap.com/docs/v3/GSAP/

Verifique disponibilidade/licença e forma de importação do plugin no projeto antes de propor uso.

## Processo
1. Inspecione o SVG, viewBox, paths, grupos, IDs e sistema de coordenadas.
2. Determine se basta animar atributos/propriedades SVG com core GSAP ou se plugin específico é necessário.
3. Para desenho de traçado, avalie DrawSVG; para transformação de paths, MorphSVG; para trajetórias, MotionPath.
4. Preserve proporções, alinhamento, fill/stroke e responsividade do viewBox.
5. Confirme compatibilidade entre paths antes de morph; ajuste geometria quando necessário.
6. Evite filtros SVG pesados em animação contínua.
7. Teste em diferentes tamanhos e densidades de tela.

## Cuidados
- Não trate todos os atributos SVG como propriedades CSS.
- Não invente suporte de plugin nem presuma que plugin premium está disponível.
- Evite IDs duplicados e seletores que atinjam SVGs de outros componentes.
- Prefira transform-origin e unidades SVG verificadas no contexto real.

Para animação acionada por scroll, consulte `gsap-scrolltrigger`; em React, `gsap-react-frameworks`.
