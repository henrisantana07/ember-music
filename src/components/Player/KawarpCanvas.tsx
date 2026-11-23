'use client'

import { Kawarp, type KawarpProps, type KawarpRef } from '@kawarp/react'

export interface KawarpCanvasProps extends KawarpProps {
  /**
   * Entrega a instância imperativa do Kawarp para quem renderiza o canvas.
   *
   * É um callback ref, não uma `ref` comum: o `next/dynamic` usado em
   * `KawarpBackground` intercepta `ref` para devolver o próprio objeto
   * `{ retry }` dele, então a instância real do Kawarp nunca chegaria lá.
   * Passando por prop, o componente dinâmico repassa normalmente.
   */
  onInstance?: (instance: KawarpRef | null) => void
}

/**
 * Casca mínima do canvas do Kawarp.
 *
 * Existe só para manter o carregamento dinâmico (`ssr: false`) no
 * `KawarpBackground` e, ao mesmo tempo, expor a instância do Kawarp. Sem isso
 * não há como chamar `loadGradient()` — que é justamente o que apresenta as
 * cores extraídas da capa no gradiente animado.
 */
export function KawarpCanvas({ onInstance, ...props }: KawarpCanvasProps) {
  return <Kawarp ref={onInstance} {...props} />
}

export default KawarpCanvas
