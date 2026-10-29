'use client'

/**
 * Ponto de entrada nomeado da Sidebar.
 *
 * A renderização real é a exportação default de `./index`, que implementa a
 * coluna desktop (240px/72px via o botão de recolher da Topbar, `useSidebarStore`),
 * a bottom nav mobile e o drawer animado. Este arquivo não mantém UI paralela:
 * apenas preserva o named export `Sidebar` para consumidores existentes.
 */
export { default as Sidebar } from './index'
