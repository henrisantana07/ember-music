---
name: gsap-interaction-flip
description: Especialista em GSAP Flip, Draggable, Observer e animações de interface acionadas por interação, gestos e mudanças de layout.
---

# GSAP Interaction & Flip

## Documentação oficial
- https://gsap.com/docs/v3/Plugins/Flip/
- https://gsap.com/docs/v3/Plugins/Draggable/
- https://gsap.com/docs/v3/Plugins/Observer/

Confirme API, dependências e disponibilidade dos plugins na versão usada.

## Processo
1. Identifique o evento: clique, drag, gesto, teclado, troca de estado ou reordenação.
2. Para transições entre layouts/estados, avalie Flip e capture o estado antes da mudança.
3. Para arrastar, use Draggable somente se o comportamento não for melhor atendido por HTML nativo/pointer events.
4. Para observar gestos/inputs complexos, avalie Observer; não substitua controles acessíveis nativos sem motivo.
5. Sincronize animação com estado real da aplicação, sem criar estado visual divergente.
6. Defina comportamento de cancelamento, interrupção, limites e retorno.
7. Teste touch, mouse, teclado, foco e dispositivos híbridos.

## Cuidados
- Não usar drag como única forma de operar uma função.
- Não bloquear scroll vertical por padrão em mobile.
- Forneça controles alternativos acessíveis para ações gestuais.
- Evite concorrência entre React e mutações imperativas de DOM.
- Limpe listeners e instâncias no unmount.
- Prefira transições CSS para mudanças triviais.

Em React, consulte `gsap-react-frameworks`; para acessibilidade e touch/performance, `gsap-quality-performance`.
