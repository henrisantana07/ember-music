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
    <CustomScroll
      className="px-4 md:px-6 py-5 flex flex-col pb-24 md:pb-5"
      wrapperClassName="main-container flex-1 min-h-0 min-w-0"
    >
      {children}
    </CustomScroll>
  )
}
