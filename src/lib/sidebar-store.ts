'use client'

import { create } from 'zustand'

/**
 * Estado da coluna de navegação (recolher/expandir) e do modo tela cheia.
 *
 * Vive numa store porque o botão que controla a sidebar está no Topbar e o
 * componente que renderiza a sidebar é irmão dele no layout — não há como
 * passar props, já que o RootLayout é Server Component. O modo tela cheia
 * segue a mesma lógica: quem liga é a hero (Outro irmão), quem obedece são
 * Topbar, Sidebar e o modal do player.
 */
interface SidebarState {
  collapsed: boolean
  toggle: () => void
  /** Tela cheia: esconde Topbar, coluna lateral e navegação inferior. */
  immersive: boolean
  setImmersive: (v: boolean) => void
  toggleImmersive: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
  immersive: false,
  setImmersive: (v) => set({ immersive: v }),
  toggleImmersive: () => set((s) => ({ immersive: !s.immersive })),
}))
