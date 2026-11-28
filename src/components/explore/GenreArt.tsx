'use client'

import { getGenreGradient } from '@/constants/genreColors'

interface GenreArtProps {
  name: string
  image?: string
  className?: string
}

/** Arte de gênero: a cor vem do catálogo, a letra dá escala e reconhecimento.
 *  Uma imagem real, quando o catálogo fornece, aparece por cima do gradiente. */
export function GenreArt({ name, image, className = '' }: GenreArtProps) {
  const gradient = getGenreGradient(name)
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
      aria-hidden="true"
    >
      {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <span
        className="absolute inset-0 flex items-center justify-center font-semibold leading-none"
        style={{ color: 'rgba(245,241,237,0.32)', fontSize: 'clamp(48px, 8vw, 96px)' }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}
