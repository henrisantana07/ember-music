'use client'

import { CustomScroll } from '@/components/CustomScroll'

export function MainContainer({ children }: { children: React.ReactNode }) {
  return (
    // `min-w-0` é obrigatório: como item flex da linha do layout, sem ele o
    // container não encolhe abaixo do min-content do conteúdo. Um carrossel
    // com muitas capas (ex.: 50 artistas relacionados) inflava a página para
    // ~7800px e o header centralizado do artista era empurrado para fora da
    // tela. Com `min-w-0` a página fica na largura da viewport e o carrossel
    // rola internamente, como deveria.
    //
    // `main-container` vai no `className` (div interno), não no wrapper: é o
    // div interno que tem `overflow-y-auto` e é o alvo do `scrollTo(0, 0)`
    // que o PageTransition dispara ao navegar. No wrapper o scrollTo seria
    // no-op, porque o wrapper não rola.
    <CustomScroll
      className="main-container px-4 md:px-6 py-5 flex flex-col pb-24 md:pb-5"
      wrapperClassName="flex-1 min-h-0 min-w-0"
    >
      {children}
    </CustomScroll>
  )
}
