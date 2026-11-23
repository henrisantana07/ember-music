'use client';
import { useEffect, useState } from 'react';
import { FALLBACK_PALETTE, type Palette } from '@/lib/palette-types';

export function useCoverPalette(videoId?: string | null): Palette {
  const [palette, setPalette] = useState<Palette>(FALLBACK_PALETTE);

  useEffect(() => {
    if (!videoId) {
      setPalette(FALLBACK_PALETTE);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/cover-palette/${videoId}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('palette'))))
      .then((p: Palette) => setPalette(p))
      .catch(() => {
        /* mantém a paleta anterior ou o fallback */
      });
    return () => controller.abort();
  }, [videoId]);

  return palette;
}
