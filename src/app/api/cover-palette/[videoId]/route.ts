import { NextResponse } from 'next/server';
import { extractPalette } from '@/lib/palette';
import { FALLBACK_PALETTE } from '@/lib/palette-types';

export const runtime = 'nodejs';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const SIZES = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'] as const;

async function paletteFromYouTube(id: string) {
  for (const size of SIZES) {
    try {
      const res = await fetch(`https://i.ytimg.com/vi/${id}/${size}.jpg`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      return await extractPalette(buf); // lança se for placeholder
    } catch {
      continue; // tenta o próximo tamanho
    }
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;

  // Validação estrita: evita SSRF e requisições inúteis.
  if (!VIDEO_ID.test(videoId)) {
    return NextResponse.json(FALLBACK_PALETTE, { status: 400 });
  }

  const palette = await paletteFromYouTube(videoId);

  if (!palette) {
    return NextResponse.json(FALLBACK_PALETTE, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }

  return NextResponse.json(palette, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
