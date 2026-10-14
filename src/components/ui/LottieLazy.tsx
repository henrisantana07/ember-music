'use client'

import dynamic from 'next/dynamic'

/**
 * The one place the Lottie engine is pulled in.
 *
 * `lottie-web` is far too large to sit in the initial bundle for an app whose
 * every page can open a carousel, so it lives in this chunk and only arrives
 * when a component below actually renders. `ssr: false` because the engine
 * reaches for `document` the moment it starts.
 *
 * The caller keeps its own placeholder (the arrow keeps its plain SVG), so
 * there is no loading fallback to design here — the swap is invisible because
 * both draw the same thing at rest.
 */
export const Lottie = dynamic(() => import('./Lottie'), { ssr: false })
