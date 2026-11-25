---
name: gsap-text-motion
description: Especialista em animação tipográfica com GSAP, SplitText, ScrambleText, linhas, palavras, caracteres e acessibilidade.
---

# GSAP Text Motion

## Documentação oficial
- https://gsap.com/docs/v3/Plugins/SplitText/
- https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/
- https://gsap.com/docs/v3/Plugins/TextPlugin/
- https://gsap.com/resources/

Confirme disponibilidade, licença, versão e API atual dos plugins antes do uso.

## Processo
1. Identifique se o texto é estático, dinâmico, traduzível, editável ou atualizado por estado.
2. Escolha a granularidade: bloco, linha, palavra ou caractere.
3. Use SplitText quando a divisão estrutural for necessária; avalie recursos atuais de re-splitting responsivo.
4. Preserve texto original acessível para leitores de tela; evite anunciar cada caractere.
5. Reverta/restaure a estrutura DOM no cleanup.
6. Considere fontes carregadas, quebra de linha, resize, conteúdo dinâmico e idiomas.
7. Para efeitos simples, avalie CSS antes de introduzir plugin.

## Cuidados
- Não dividir texto de controles interativos sem preservar nome acessível.
- Não deixar wrappers duplicados após re-render ou resize.
- Não animar conteúdo crítico de forma que fique invisível quando JS falhar.
- Não usar ScrambleText como substituto de conteúdo legível.
- Não presumir plugin incluído no core.

Em React, leia `gsap-react-frameworks`; para motion/reduced motion, `gsap-quality-performance`.
