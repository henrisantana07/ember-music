'use client';
import { useEffect, useRef, useState } from 'react';
import { useCoverPalette } from '@/hooks/useCoverPalette';
import type { Palette } from '@/lib/palette-types';

const toGradient = (p: Palette) =>
  [
    `radial-gradient(120% 90% at 15% 0%, ${p.primary} 0%, transparent 60%)`,
    `radial-gradient(110% 90% at 100% 100%, ${p.secondary} 0%, transparent 60%)`,
    `linear-gradient(180deg, ${p.base} 0%, #050505 100%)`,
  ].join(', ');

export function HeroBackground({ videoId }: { videoId?: string | null }) {
  const palette = useCoverPalette(videoId);
  const [slots, setSlots] = useState<[string, string]>(() => [
    toGradient(palette),
    toGradient(palette),
  ]);
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);

  useEffect(() => {
    const back = 1 - frontRef.current;
    setSlots((s) => {
      const next: [string, string] = [s[0], s[1]];
      next[back] = toGradient(palette);
      return next;
    });
    frontRef.current = back;
    setFront(back);
  }, [palette]);

  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {slots.map((background, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none"
          style={{ background, opacity: front === i ? 1 : 0 }}
        />
      ))}
      {/* escurece levemente para garantir contraste do texto */}
      <div className="absolute inset-0 bg-black/25" />
    </div>
  );
}
