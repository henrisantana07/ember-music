/**
 * Grades de catálogo compartilhadas.
 *
 * Em telas estreitas, `minmax(220px,1fr)` / `180px` / `240px` produziam UMA
 * coluna de largura total (288px em 320px de viewport), com capas enormes e um
 * card por tela. Abaixo de `sm` usamos duas colunas fluidas; a partir de `sm`
 * mantemos a grade auto-fill original, que já funciona bem no desktop.
 */
export const CATALOG_GRID = 'grid grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] gap-3 sm:gap-6'
export const LIBRARY_GRID = 'grid grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-4'
export const TRACK_GRID = 'grid grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4'
export const ARTIST_GRID = 'grid grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] gap-3 sm:gap-4'
