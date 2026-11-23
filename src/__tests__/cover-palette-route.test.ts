import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/cover-palette/[videoId]/route';
import { FALLBACK_PALETTE } from '@/lib/palette-types';

describe('GET /api/cover-palette/[videoId]', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna 400 com paleta fallback se videoId for inválido', async () => {
    const req = new Request('http://localhost:3000/api/cover-palette/invalido');
    const res = await GET(req, { params: Promise.resolve({ videoId: 'invalido' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual(FALLBACK_PALETTE);
  });

  it('retorna paleta fallback se busca na thumbnail falhar', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    const req = new Request('http://localhost:3000/api/cover-palette/dQw4w9WgXcQ');
    const res = await GET(req, { params: Promise.resolve({ videoId: 'dQw4w9WgXcQ' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(FALLBACK_PALETTE);
  });
});
