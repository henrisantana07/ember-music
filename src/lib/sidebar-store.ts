'use client'

import { create } from 'zustand'

/**
 * Estado da coluna de navegação (recolher/expandir).
 *
 * Vive numa store porque o botão que controla a sidebar está no Topbar e o
 * componente que renderiza a sidebar é irmão dele no layout — não há como
 * passar props, já que o RootLayout é Server Component.
 */
interface SidebarState {
  collapsed: boolean
  toggle: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
}))
