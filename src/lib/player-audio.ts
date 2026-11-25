'use client'

/**
 * O elemento `<audio>` é único e vive no Player. Esta referência compartilhada
 * permite que a barra de progresso da hero e a do rodapé usem o MESMO elemento
 * (e a mesma store) sem criar um segundo player nem estado paralelo.
 */
export const playerAudioRef: { current: HTMLAudioElement | null } = { current: null }

/* A barra de progresso avisa quando o dedo está nela: o `timeupdate` do áudio
   não deve puxar a barra de volta enquanto o usuário arrasta. */
export const progressDragState: { current: boolean } = { current: false }
