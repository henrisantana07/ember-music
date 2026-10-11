'use client'

import { useState } from 'react'
import { getHighResCoverUrl, getLowResCoverUrl } from '@/lib/image-utils'

const PLACEHOLDER = '/placeholder.svg'

interface CoverImageProps {
  src?: string | null
  videoId?: string
  alt: string
  className?: string
}

export function CoverImage({ src, videoId, alt, className }: CoverImageProps) {
  const hd = getHighResCoverUrl(src ?? '', videoId)
  const low = getLowResCoverUrl(src ?? '', videoId)
  const [state, setState] = useState({ key: hd, value: hd })
  const currentSrc = state.key === hd ? state.value : hd

  function update(next: (prev: string) => string) {
    setState((prev) => ({ key: hd, value: next(prev.key === hd ? prev.value : hd) }))
  }

  function handleError() {
    update((prev) => {
      if (low && low !== prev) return low
      if (prev && prev !== PLACEHOLDER) return PLACEHOLDER
      return prev
    })
  }

  function handleLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const width = event.currentTarget.naturalWidth
    if (width > 0 && width < 640 && low && low !== currentSrc) {
      update(() => low)
    }
  }

  if (!currentSrc) {
    return <img src={PLACEHOLDER} alt={alt} className={className} loading="lazy" />
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading="lazy"
      crossOrigin="anonymous"
      onError={handleError}
      onLoad={handleLoad}
    />
  )
}
